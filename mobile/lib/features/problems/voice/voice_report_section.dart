import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/models/models.dart';
import 'voice_report_controller.dart';

class VoiceReportSection extends ConsumerWidget {
  const VoiceReportSection({
    super.key,
    required this.onGenerated,
    required this.hindi,
  });

  final ValueChanged<VoiceReportDraft> onGenerated;
  final bool hindi;

  String _text(String english, String translated) =>
      hindi ? translated : english;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.watch(voiceReportControllerProvider);
    final state = controller.state;
    final recording = state.phase == VoiceReportPhase.recording;
    final processing = state.phase == VoiceReportPhase.uploading;
    final hasRecording = state.audioPath != null;

    return Card(
      color:
          Theme.of(context).colorScheme.primaryContainer.withValues(alpha: .3),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CircleAvatar(
              child: Icon(recording ? Icons.mic : Icons.mic_none_outlined),
            ),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(_text('Speak instead of typing', 'लिखने के बजाय बोलें'),
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_text(
                      'Describe the problem in your own language. You can review and edit everything before submitting.',
                      'अपनी भाषा में समस्या बताएँ। भेजने से पहले आप सब कुछ जाँच और बदल सकते हैं।')),
                ])),
          ]),
          const SizedBox(height: 14),
          if (recording) ...[
            Row(children: [
              const Icon(Icons.fiber_manual_record,
                  color: Colors.red, size: 18),
              const SizedBox(width: 8),
              Expanded(
                  child: Text(
                      '${_text('Recording', 'रिकॉर्डिंग')} · ${_duration(state.elapsed)} / 2:00',
                      style: const TextStyle(fontWeight: FontWeight.w700))),
              FilledButton.tonalIcon(
                onPressed: controller.stop,
                icon: const Icon(Icons.stop),
                label: Text(_text('Stop', 'रोकें')),
              ),
            ]),
            const LinearProgressIndicator(),
          ] else if (!hasRecording) ...[
            FilledButton.icon(
              onPressed: state.phase == VoiceReportPhase.requestingPermission
                  ? null
                  : controller.start,
              icon: const Icon(Icons.mic),
              label: Text(state.phase == VoiceReportPhase.requestingPermission
                  ? _text('Waiting for permission…', 'अनुमति की प्रतीक्षा…')
                  : _text('Start voice recording', 'आवाज़ रिकॉर्ड करें')),
            ),
          ] else ...[
            Row(children: [
              IconButton.filledTonal(
                  onPressed: processing ? null : controller.togglePlayback,
                  icon: Icon(state.playing ? Icons.pause : Icons.play_arrow),
                  tooltip: state.playing ? 'Pause' : 'Play'),
              const SizedBox(width: 8),
              Expanded(
                  child: Text(
                      '${_text('Recording', 'रिकॉर्डिंग')} · ${_duration(state.elapsed)}')),
              IconButton(
                  onPressed: processing ? null : controller.deleteRecording,
                  icon: const Icon(Icons.delete_outline),
                  tooltip: _text(
                      'Delete and record again', 'हटाकर फिर रिकॉर्ड करें')),
            ]),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: processing
                  ? null
                  : () async {
                      final draft = await controller.generate();
                      if (draft != null) onGenerated(draft);
                    },
              icon: processing
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.auto_awesome),
              label: Text(processing
                  ? _text('Creating your report…', 'आपकी रिपोर्ट बन रही है…')
                  : state.draft == null
                      ? _text(
                          'Create report from voice', 'आवाज़ से रिपोर्ट बनाएँ')
                      : _text('Generate again', 'फिर से बनाएँ')),
            ),
          ],
          if (state.error != null) ...[
            const SizedBox(height: 10),
            Text(state.error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error)),
            if (state.permissionPermanentlyDenied)
              TextButton(
                  onPressed: controller.openSettings,
                  child: Text(_text(
                      'Open Android settings', 'Android सेटिंग्स खोलें'))),
          ],
          if (state.draft != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(12)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                        '✓ ${_text('Report created from', 'रिपोर्ट की भाषा')} ${state.draft!.languageName} (${state.draft!.languageCode})',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                        '${_text('Suggested category', 'सुझाई गई श्रेणी')}: ${state.draft!.domain}'),
                    ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      childrenPadding: EdgeInsets.zero,
                      title: Text(_text('View transcript', 'लिखित रूप देखें')),
                      children: [
                        Align(
                            alignment: Alignment.centerLeft,
                            child: Text(state.draft!.transcript))
                      ],
                    ),
                  ]),
            ),
          ],
          const SizedBox(height: 8),
          Text(
              _text(
                  'Maximum 2 minutes. Voice creates a draft and never submits automatically.',
                  'अधिकतम 2 मिनट। आवाज़ केवल ड्राफ़्ट बनाती है, अपने आप जमा नहीं करती।'),
              style: Theme.of(context).textTheme.bodySmall),
        ]),
      ),
    );
  }

  String _duration(Duration value) =>
      '${value.inMinutes}:${(value.inSeconds % 60).toString().padLeft(2, '0')}';
}
