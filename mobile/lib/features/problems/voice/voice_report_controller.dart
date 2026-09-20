import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../../auth/auth_controller.dart';
import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';

enum VoiceReportPhase {
  idle,
  requestingPermission,
  recording,
  recorded,
  uploading,
  generated,
  failed,
}

class VoiceReportState {
  const VoiceReportState({
    this.phase = VoiceReportPhase.idle,
    this.audioPath,
    this.elapsed = Duration.zero,
    this.draft,
    this.error,
    this.permissionPermanentlyDenied = false,
    this.playing = false,
  });

  final VoiceReportPhase phase;
  final String? audioPath;
  final Duration elapsed;
  final VoiceReportDraft? draft;
  final String? error;
  final bool permissionPermanentlyDenied;
  final bool playing;

  VoiceReportState copyWith({
    VoiceReportPhase? phase,
    String? audioPath,
    bool clearAudioPath = false,
    Duration? elapsed,
    VoiceReportDraft? draft,
    bool clearDraft = false,
    String? error,
    bool clearError = false,
    bool? permissionPermanentlyDenied,
    bool? playing,
  }) =>
      VoiceReportState(
        phase: phase ?? this.phase,
        audioPath: clearAudioPath ? null : audioPath ?? this.audioPath,
        elapsed: elapsed ?? this.elapsed,
        draft: clearDraft ? null : draft ?? this.draft,
        error: clearError ? null : error ?? this.error,
        permissionPermanentlyDenied:
            permissionPermanentlyDenied ?? this.permissionPermanentlyDenied,
        playing: playing ?? this.playing,
      );
}

final voiceReportControllerProvider = ChangeNotifierProvider.autoDispose(
    (ref) => VoiceReportController(ref.read(apiClientProvider)));

class VoiceReportController extends ChangeNotifier {
  VoiceReportController(this._api) {
    _player.playerStateStream.listen((playerState) {
      final playing = playerState.playing &&
          playerState.processingState != ProcessingState.completed;
      if (_state.playing != playing) {
        _state = _state.copyWith(playing: playing);
        notifyListeners();
      }
      if (playerState.processingState == ProcessingState.completed) {
        _player.seek(Duration.zero);
      }
    });
  }

  static const maximumDuration = Duration(minutes: 2);
  final ApiClient _api;
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();
  Timer? _timer;
  VoiceReportState _state = const VoiceReportState();

  VoiceReportState get state => _state;

  Future<void> start() async {
    _setState(_state.copyWith(
      phase: VoiceReportPhase.requestingPermission,
      clearError: true,
      permissionPermanentlyDenied: false,
    ));
    final permission = await Permission.microphone.request();
    if (!permission.isGranted) {
      _setState(_state.copyWith(
        phase: VoiceReportPhase.failed,
        error: permission.isPermanentlyDenied
            ? 'Microphone access is disabled. Open Android settings to enable it, or type your report.'
            : 'Microphone permission was denied. You can try again or type your report.',
        permissionPermanentlyDenied: permission.isPermanentlyDenied,
      ));
      return;
    }

    await deleteRecording(clearDraft: true);
    try {
      final directory = await getTemporaryDirectory();
      final audioPath =
          '${directory.path}${Platform.pathSeparator}civicx-voice-${DateTime.now().microsecondsSinceEpoch}.m4a';
      await _recorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
          numChannels: 1,
        ),
        path: audioPath,
      );
      _setState(VoiceReportState(
        phase: VoiceReportPhase.recording,
        audioPath: audioPath,
      ));
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        final elapsed = _state.elapsed + const Duration(seconds: 1);
        _setState(_state.copyWith(elapsed: elapsed));
        if (elapsed >= maximumDuration) stop();
      });
    } catch (_) {
      _setState(_state.copyWith(
        phase: VoiceReportPhase.failed,
        error:
            'The microphone could not start. Check whether another app is using it.',
      ));
    }
  }

  Future<void> stop() async {
    _timer?.cancel();
    _timer = null;
    try {
      final recordedPath = await _recorder.stop();
      final path = recordedPath ?? _state.audioPath;
      if (path == null ||
          !await File(path).exists() ||
          await File(path).length() == 0) {
        _setState(_state.copyWith(
          phase: VoiceReportPhase.failed,
          error: 'No audio was captured. Please record again.',
          clearAudioPath: true,
        ));
        return;
      }
      await _player.setFilePath(path);
      _setState(_state.copyWith(
        phase: VoiceReportPhase.recorded,
        audioPath: path,
        clearError: true,
      ));
    } catch (_) {
      _setState(_state.copyWith(
        phase: VoiceReportPhase.failed,
        error: 'The recording could not be saved. Please record again.',
      ));
    }
  }

  Future<void> togglePlayback() async {
    if (_state.audioPath == null) return;
    if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<VoiceReportDraft?> generate() async {
    final path = _state.audioPath;
    if (path == null) return null;
    _setState(
        _state.copyWith(phase: VoiceReportPhase.uploading, clearError: true));
    try {
      final draft = await _api.createVoiceReportDraft(path);
      _setState(_state.copyWith(
        phase: VoiceReportPhase.generated,
        draft: draft,
        clearError: true,
      ));
      return draft;
    } on DioException catch (error) {
      final body = error.response?.data;
      final message = body is Map
          ? ((body['error'] as Map?)?['message'] ?? body['message'])
          : null;
      _setState(_state.copyWith(
        phase: VoiceReportPhase.failed,
        error: message?.toString() ??
            (error.type == DioExceptionType.receiveTimeout
                ? 'Voice processing is taking too long. Your recording is still here; please retry.'
                : 'The recording could not be processed. Check your connection and retry.'),
      ));
    } catch (_) {
      _setState(_state.copyWith(
        phase: VoiceReportPhase.failed,
        error: 'The recording could not be processed. Please retry.',
      ));
    }
    return null;
  }

  Future<void> openSettings() => openAppSettings();

  Future<void> deleteRecording({bool clearDraft = true}) async {
    _timer?.cancel();
    _timer = null;
    if (await _recorder.isRecording()) await _recorder.stop();
    await _player.stop();
    final path = _state.audioPath;
    if (path != null) {
      final file = File(path);
      if (await file.exists()) await file.delete();
    }
    _setState(VoiceReportState(
      draft: clearDraft ? null : _state.draft,
      phase: clearDraft || _state.draft == null
          ? VoiceReportPhase.idle
          : VoiceReportPhase.generated,
    ));
  }

  void _setState(VoiceReportState value) {
    _state = value;
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _recorder.dispose();
    _player.dispose();
    final path = _state.audioPath;
    if (path != null) unawaited(_deleteIfPresent(path));
    super.dispose();
  }

  Future<void> _deleteIfPresent(String path) async {
    final file = File(path);
    if (await file.exists()) await file.delete();
  }
}
