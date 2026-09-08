import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/models.dart';
import '../../core/network/api_client.dart';

enum AuthStatus { checking, signedOut, signedIn }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.error,
    this.isDemo = false,
  });

  final AuthStatus status;
  final User? user;
  final String? error;
  final bool isDemo;
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
    state = const AuthState(status: AuthStatus.checking);
    try {
      final user = await _api.login(email, password);
      state = AuthState(status: AuthStatus.signedIn, user: user);
      return true;
    } catch (error) {
      state = AuthState(status: AuthStatus.signedOut, error: _message(error));
      return false;
    }
  }

  void demoLogin() {
    state = const AuthState(
      status: AuthStatus.signedIn,
      isDemo: true,
      user: User(
        id: 'demo-citizen',
        name: 'Demo Citizen',
        email: 'demo@civix.local',
        role: 'citizen',
        accountStatus: 'active',
      ),
    );
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

  String _message(Object error) =>
      error.toString().replaceFirst('Exception: ', '');
}
