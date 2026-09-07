import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore {
  const SessionStore(this._storage);

  final FlutterSecureStorage _storage;

  Future<String?> readAccessToken() => _storage.read(key: 'access_token');
  Future<String?> readRefreshToken() => _storage.read(key: 'refresh_token');
  Future<void> save({required String accessToken, String? refreshToken}) async {
    await _storage.write(key: 'access_token', value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: 'refresh_token', value: refreshToken);
    }
  }

  Future<void> clear() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }
}
