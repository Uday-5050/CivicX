import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../storage/session_store.dart';

final sessionStoreProvider =
    Provider<SessionStore>((ref) => SessionStore(const FlutterSecureStorage()));

class ApiClient {
  ApiClient(this._sessionStore)
      : dio = Dio(BaseOptions(
            baseUrl: AppConfig.apiBaseUrl,
            headers: {'Accept': 'application/json'})) {
    dio.interceptors
        .add(InterceptorsWrapper(onRequest: (options, handler) async {
      final token = await _sessionStore.readAccessToken();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    }, onError: (error, handler) async {
      final request = error.requestOptions;
      if (error.response?.statusCode == 401 &&
          request.extra['retried'] != true &&
          await _refreshAccessToken()) {
        request.extra['retried'] = true;
        final response = await dio.fetch(request);
        handler.resolve(response);
        return;
      }
      handler.next(error);
    }));
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
          refreshToken: data['refreshToken'] as String?);
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
        refreshToken: data['refreshToken'] as String?);
    return User.fromJson(Map<String, dynamic>.from(data['user'] as Map));
  }

  Future<User> register(String name, String email, String password) async {
    final response = await dio.post('/auth/register',
        data: {'name': name, 'email': email, 'password': password});
    return User.fromJson(
        Map<String, dynamic>.from(response.data['data'] as Map));
  }

  Future<void> logout() async {
    final refresh = await _sessionStore.readRefreshToken();
    try {
      await dio.post('/auth/mobile/logout', data: {'refreshToken': refresh});
    } finally {
      await _sessionStore.clear();
    }
  }

  Future<String> uploadAttachment(String filePath) async {
    final response = await dio.post('/uploads',
        data:
            FormData.fromMap({'file': await MultipartFile.fromFile(filePath)}));
    final data = Map<String, dynamic>.from(response.data['data'] as Map);
    return '${data['id']}';
  }

  Future<List<Problem>> myProblems() async {
    final response =
        await dio.get('/problems', queryParameters: {'submittedBy': 'me'});
    final raw = (response.data['data'] as List<dynamic>? ?? const []);
    return raw
        .map((item) => Problem.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<Problem> createProblem(
      {required String title,
      required String description,
      required String domain,
      String? districtId,
      double? latitude,
      double? longitude,
      List<String> attachmentIds = const [],
      String? idempotencyKey}) async {
    final response = await dio.post('/problems',
        data: {
          'title': title,
          'description': description,
          'domain': domain,
          'location': {
            'districtId': districtId,
            'coordinates': latitude == null || longitude == null
                ? null
                : {'lat': latitude, 'lng': longitude}
          },
          'submitterType': 'individual',
          'attachmentIds': attachmentIds,
          'confirmDuplicate': false,
        },
        options: Options(headers: {
          'Idempotency-Key': idempotencyKey ??
              'mobile-${DateTime.now().microsecondsSinceEpoch}'
        }));
    return Problem.fromJson(
        Map<String, dynamic>.from(response.data['data'] as Map));
  }
}
