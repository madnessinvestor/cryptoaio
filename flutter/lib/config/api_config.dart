import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String _key = 'server_base_url';
  static const String defaultUrl = 'http://10.0.2.2:5000'; // Android emulator → localhost

  static String _baseUrl = defaultUrl;

  static String get baseUrl => _baseUrl;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString(_key) ?? defaultUrl;
  }

  static Future<void> save(String url) async {
    // Strip trailing slash
    final clean = url.trimRight().replaceAll(RegExp(r'/+$'), '');
    _baseUrl = clean;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, clean);
  }

  static String url(String path) {
    final base = _baseUrl.replaceAll(RegExp(r'/+$'), '');
    final p = path.startsWith('/') ? path : '/$path';
    return '$base$p';
  }
}
