import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path/path.dart' as path;

import '../config/app_config.dart';
import '../models/models.dart';
import '../storage/session_store.dart';

final sessionStoreProvider =
    Provider<SessionStore>((ref) => SessionStore(const FlutterSecureStorage()));

class ApiClient {
  ApiClient(this._sessionStore)
      : dio = Dio(BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          headers: {'Accept': 'application/json'},
        )) {
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _sessionStore.readAccessToken();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) async {
        final request = error.requestOptions;
        if (error.response?.statusCode == 401 &&
            request.extra['retried'] != true &&
            await _refreshAccessToken()) {
          request.extra['retried'] = true;
          handler.resolve(await dio.fetch(request));
          return;
        }
        handler.next(error);
      },
    ));
  }

  final SessionStore _sessionStore;
  final Dio dio;
  SessionStore get sessionStore => _sessionStore;

  Future<bool> _refreshAccessToken() async {
    final refreshToken = await _sessionStore.readRefreshToken();
    if (refreshToken == null) return false;
    try {
      final response = await Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl))
          .post('/auth/mobile/refresh', data: {'refreshToken': refreshToken});
      final data = Map<String, dynamic>.from(response.data['data'] as Map);
      await _sessionStore.save(
        accessToken: '${data['accessToken']}',
        refreshToken: data['refreshToken'] as String?,
      );
      return true;
    } catch (_) {
      await _sessionStore.clear();
      return false;
    }
  }

  Future<User> login(String email, String password) async {
    final response = await dio.post('/auth/mobile/login',
        data: {'email': email, 'password': password});
    final data = Map<String, dynamic>.from(response.data['data'] as Map);
    await _sessionStore.save(
      accessToken: '${data['accessToken']}',
      refreshToken: data['refreshToken'] as String?,
    );
    return User.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<User> register(String name, String email, String password) async {
    final response = await dio.post('/auth/register',
        data: {'name': name, 'email': email, 'password': password});
    final data = Map<String, dynamic>.from(response.data['data'] as Map);
    return User.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<void> logout() async {
    final refresh = await _sessionStore.readRefreshToken();
    try {
      await dio.post('/auth/mobile/logout', data: {'refreshToken': refresh});
    } finally {
      await _sessionStore.clear();
    }
  }

  Future<List<Problem>> mySubmissions() async {
    final response = await dio.get('/submissions');
    final raw = (response.data['data'] as List<dynamic>? ?? const []);
    return raw
        .map((item) => Problem.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<Problem> createSubmission({
    required String title,
    required String description,
    required String domain,
    required String location,
    required List<String> attachmentPaths,
    required String idempotencyKey,
  }) async {
    final files = await Future.wait(attachmentPaths.map((filePath) async =>
        MultipartFile.fromFile(filePath, filename: path.basename(filePath))));
    final response = await dio.post('/submissions',
        data: FormData.fromMap({
          'title': title,
          'description': description,
          'domain': domain,
          'location': location,
          'submitterType': 'citizen',
          'idempotencyKey': idempotencyKey,
          'attachments': files,
        }));
    return Problem.fromJson(
        Map<String, dynamic>.from(response.data['data'] as Map));
  }
}
