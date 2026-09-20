import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/models.dart';
import '../../core/network/api_client.dart';

enum AuthStatus { checking, signedOut, signedIn }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.error,
  });

  final AuthStatus status;
  final User? user;
  final String? error;
}

final apiClientProvider =
    Provider<ApiClient>((ref) => ApiClient(ref.read(sessionStoreProvider)));

final authProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  final controller = AuthController(ref.read(apiClientProvider));
  controller.restore();
  return controller;
});

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._api)
      : super(const AuthState(status: AuthStatus.checking));

  final ApiClient _api;

  Future<void> restore() async {
    final token = await _api.sessionStore.readAccessToken();
    if (token == null) {
      state = const AuthState(status: AuthStatus.signedOut);
      return;
    }
    try {
      final response = await _api.dio.get('/auth/me');
      final data = Map<String, dynamic>.from(response.data['data'] as Map);
      state = AuthState(
          status: AuthStatus.signedIn,
          user: User.fromJson(Map<String, dynamic>.from(data['user'] as Map)));
    } catch (_) {
      await _api.sessionStore.clear();
      state = const AuthState(status: AuthStatus.signedOut);
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      final user = await _api.login(email, password);
      state = AuthState(status: AuthStatus.signedIn, user: user);
      return true;
    } catch (error) {
      state = AuthState(status: AuthStatus.signedOut, error: _message(error));
      return false;
    }
  }

  Future<String?> register(String name, String email, String password) async {
    try {
      await _api.register(name, email, password);
      return null;
    } catch (error) {
      return _message(error);
    }
  }

  Future<void> logout() async {
    await _api.logout();
    state = const AuthState(status: AuthStatus.signedOut);
  }

  String _message(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      final backendMessage = body is Map
          ? ((body['error'] as Map?)?['message'] ?? body['message'])
          : null;
      if (backendMessage != null) return backendMessage.toString();
      final status = error.response?.statusCode;
      if (status == 404 || status == 502 || status == 503) {
        return 'The CivicX server is temporarily unavailable. Please try again shortly.';
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.connectionError) {
        return 'Could not reach CivicX. Check your internet connection and try again.';
      }
    }
    return error.toString().replaceFirst('Exception: ', '');
  }
}
