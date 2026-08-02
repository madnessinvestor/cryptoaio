import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});
  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiService {
  static final _client = http.Client();

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  static Future<dynamic> _get(String path, {Map<String, String>? params}) async {
    var uri = Uri.parse(ApiConfig.url(path));
    if (params != null) uri = uri.replace(queryParameters: params);
    final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 30));
    if (res.statusCode >= 400) throw ApiException(res.body, statusCode: res.statusCode);
    return json.decode(res.body);
  }

  static Future<dynamic> _post(String path, [Map<String, dynamic>? body]) async {
    final res = await _client
        .post(Uri.parse(ApiConfig.url(path)),
            headers: _headers, body: body != null ? json.encode(body) : null)
        .timeout(const Duration(seconds: 30));
    if (res.statusCode >= 400) throw ApiException(res.body, statusCode: res.statusCode);
    return json.decode(res.body);
  }

  static Future<dynamic> _put(String path, Map<String, dynamic> body) async {
    final res = await _client
        .put(Uri.parse(ApiConfig.url(path)), headers: _headers, body: json.encode(body))
        .timeout(const Duration(seconds: 30));
    if (res.statusCode >= 400) throw ApiException(res.body, statusCode: res.statusCode);
    return json.decode(res.body);
  }

  // ignore: unused_element
  static Future<dynamic> _delete(String path) async {
    final res = await _client
        .delete(Uri.parse(ApiConfig.url(path)), headers: _headers)
        .timeout(const Duration(seconds: 30));
    if (res.statusCode >= 400) throw ApiException(res.body, statusCode: res.statusCode);
    return json.decode(res.body);
  }

  // ── Watchlist ──────────────────────────────────────────────────────────────

  static Future<List<dynamic>> getAssets() async => await _get('/api/assets') as List;

  static Future<Map<String, dynamic>> addAsset(String symbol) async =>
      await _post('/api/assets', {'symbol': symbol.toUpperCase()});

  static Future<void> deleteAsset(String symbol) async =>
      await _delete('/api/assets/$symbol');

  static Future<Map<String, dynamic>> getPrice(String symbol,
      {String currency = 'USD'}) async =>
      await _get('/api/price', params: {'symbol': symbol, 'currency': currency});

  static Future<List<dynamic>> searchAssets(String query) async =>
      await _get('/api/search', params: {'q': query}) as List;

  static Future<Map<String, dynamic>> getRates() async =>
      await _get('/api/rates');

  // ── Alerts ────────────────────────────────────────────────────────────────

  static Future<List<dynamic>> getAlerts() async => await _get('/api/alerts') as List;

  static Future<Map<String, dynamic>> addAlert(Map<String, dynamic> data) async =>
      await _post('/api/alerts', data);

  static Future<void> deleteAlert(String id) async =>
      await _delete('/api/alerts/$id');

  static Future<void> resetAlert(String id) async =>
      await _post('/api/alerts/$id/reset');

  // ── Portfolio / Trade ─────────────────────────────────────────────────────

  static Future<List<dynamic>> getPortfolio() async =>
      await _get('/api/portfolio') as List;

  static Future<Map<String, dynamic>> addTrade(Map<String, dynamic> data) async =>
      await _post('/api/portfolio', data);

  static Future<void> deleteTicker(String ticker) async =>
      await _delete('/api/portfolio/$ticker');

  static Future<void> deleteTrade(String ticker, int idx) async =>
      await _delete('/api/portfolio/$ticker/trade/$idx');

  static Future<Map<String, dynamic>> getHistory(String symbol) async =>
      await _get('/api/history', params: {'symbol': symbol});

  static Future<Map<String, dynamic>> getPerf() async =>
      await _get('/api/perf');

  // ── Dashboard ─────────────────────────────────────────────────────────────

  static Future<List<dynamic>> getDashWallets() async =>
      await _get('/api/dashboard/wallets') as List;

  static Future<Map<String, dynamic>> addDashWallet(Map<String, dynamic> data) async =>
      await _post('/api/dashboard/wallets', data);

  static Future<void> deleteDashWallet(String address) async =>
      await _delete('/api/dashboard/wallets/$address');

  static Future<Map<String, dynamic>> refreshDashWallet(String address) async =>
      await _post('/api/dashboard/wallets/$address/refresh');

  static Future<List<dynamic>> getDashManual() async =>
      await _get('/api/dashboard/manual') as List;

  static Future<Map<String, dynamic>> getDashChart({String period = '1D'}) async =>
      await _get('/api/dashboard/chart', params: {'period': period});

  static Future<List<dynamic>> getDashHistory() async =>
      await _get('/api/dashboard/history') as List;

  static Future<Map<String, dynamic>> getDashStatus() async =>
      await _get('/api/dashboard/status');

  // ── Mad AI ────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> aiChat(List<Map<String, dynamic>> messages,
      {Map<String, dynamic>? config}) async =>
      await _post('/api/ai/chat', {'messages': messages, if (config != null) 'config': config});

  static Future<Map<String, dynamic>> aiStatus() async =>
      await _get('/api/ai/status');

  // ── Widget settings ───────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> getWidgetSettings() async =>
      await _get('/api/widget/settings');

  static Future<void> saveWidgetSettings(Map<String, dynamic> data) async =>
      await _post('/api/widget/settings', data);

  // ── Backup / Data ─────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> exportData() async =>
      await _get('/api/data/export');

  static Future<Map<String, dynamic>> resetData() async =>
      await _post('/api/data/reset');

  // ── Health check ──────────────────────────────────────────────────────────

  static Future<bool> ping() async {
    try {
      await _get('/api/rates');
      return true;
    } catch (_) {
      return false;
    }
  }
}
