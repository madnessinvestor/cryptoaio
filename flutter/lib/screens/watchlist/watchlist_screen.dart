import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/asset.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';
import '../../main.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});
  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<Asset> _assets = [];
  bool _loading = true;
  String? _error;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _load();
    _refreshTimer = Timer.periodic(const Duration(seconds: 60), (_) => _refreshPrices());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final raw = await ApiService.getAssets();
      final assets = raw.map((j) => Asset.fromJson(j as Map<String, dynamic>)).toList();
      if (mounted) setState(() { _assets = assets; _loading = false; });
      await _refreshPrices();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _refreshPrices() async {
    if (_assets.isEmpty) return;
    try {
      final updated = <Asset>[];
      // Fetch prices in parallel (max 5 at a time)
      for (var i = 0; i < _assets.length; i += 5) {
        final batch = _assets.sublist(i, i + 5 > _assets.length ? _assets.length : i + 5);
        final futures = batch.map((a) => ApiService.getPrice(a.symbol).then((r) {
          return a.copyWith(
            price: (r['price'] as num?)?.toDouble(),
            change24h: (r['change_24h'] as num?)?.toDouble(),
          );
        }).catchError((_) => a));
        updated.addAll(await Future.wait(futures));
      }
      if (mounted) setState(() => _assets = updated);
    } catch (_) {}
  }

  Future<void> _addAsset() async {
    final ctrl = TextEditingController();
    List<dynamic> suggestions = [];
    bool searching = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 16, right: 16, top: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Adicionar ativo', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                autofocus: true,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Ex: BTC, ETH, SOL…',
                  hintStyle: const TextStyle(color: AppColors.textSecond),
                  filled: true, fillColor: AppColors.surfaceHigh,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                  suffixIcon: searching ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent))) : null,
                ),
                onChanged: (v) async {
                  if (v.length < 2) { setSt(() => suggestions = []); return; }
                  setSt(() => searching = true);
                  try {
                    final res = await ApiService.searchAssets(v);
                    setSt(() { suggestions = res.take(6).toList(); searching = false; });
                  } catch (_) { setSt(() => searching = false); }
                },
              ),
              if (suggestions.isNotEmpty) ...[
                const SizedBox(height: 8),
                ...suggestions.map((s) => ListTile(
                  dense: true,
                  leading: CircleAvatar(
                    radius: 14,
                    backgroundColor: AppColors.surfaceHigh,
                    child: Text((s['symbol'] ?? '?')[0], style: const TextStyle(color: Colors.white, fontSize: 11)),
                  ),
                  title: Text('${s['symbol']} — ${s['name'] ?? ''}', style: const TextStyle(color: Colors.white, fontSize: 13)),
                  subtitle: s['exchange'] != null ? Text(s['exchange'], style: const TextStyle(color: AppColors.textSecond, fontSize: 11)) : null,
                  onTap: () async {
                    Navigator.pop(ctx);
                    await _doAdd(s['symbol']);
                  },
                )),
              ],
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: ctrl.text.trim().isEmpty ? null : () async {
                    Navigator.pop(ctx);
                    await _doAdd(ctrl.text.trim());
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.black),
                  child: const Text('+ Adicionar', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _doAdd(String symbol) async {
    try {
      await ApiService.addAsset(symbol);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _deleteAsset(Asset a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text('Remover ${a.symbol}?', style: const TextStyle(color: Colors.white)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Remover', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.deleteAsset(a.symbol);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Watchlist', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.background,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: AppColors.textSecond), onPressed: _load),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addAsset,
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.black,
        child: const Icon(Icons.add),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.accent));
    if (_error != null) return _errorView();
    if (_assets.isEmpty) return _emptyView();
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.only(top: 8, bottom: 80),
        itemCount: _assets.length,
        separatorBuilder: (_, __) => const Divider(color: AppColors.divider, height: 1, indent: 16, endIndent: 16),
        itemBuilder: (_, i) => _AssetTile(asset: _assets[i], onDelete: () => _deleteAsset(_assets[i])),
      ),
    );
  }

  Widget _errorView() => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off, color: AppColors.textSecond, size: 48),
          const SizedBox(height: 12),
          const Text('Não foi possível conectar ao servidor', style: TextStyle(color: Colors.white), textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text('Verifique a URL em Config', style: const TextStyle(color: AppColors.textSecond, fontSize: 12), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _load, style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.black), child: const Text('Tentar novamente')),
        ],
      ),
    ),
  );

  Widget _emptyView() => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.show_chart, color: AppColors.textSecond, size: 48),
        const SizedBox(height: 12),
        const Text('Nenhum ativo adicionado', style: TextStyle(color: Colors.white)),
        const SizedBox(height: 4),
        const Text('Toque em + para adicionar', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
      ],
    ),
  );
}

class _AssetTile extends StatelessWidget {
  final Asset asset;
  final VoidCallback onDelete;
  const _AssetTile({required this.asset, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final change = asset.change24h;
    final isPos = change != null && change >= 0;
    final changeColor = change == null ? AppColors.textSecond : (isPos ? AppColors.positive : AppColors.negative);

    final iconUrl = asset.iconUrl != null
        ? (asset.iconUrl!.startsWith('http') ? asset.iconUrl! : ApiConfig.url(asset.iconUrl!))
        : null;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: CircleAvatar(
        radius: 20,
        backgroundColor: AppColors.surfaceHigh,
        child: iconUrl != null
            ? ClipOval(child: CachedNetworkImage(imageUrl: iconUrl, width: 32, height: 32, fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Text(asset.symbol[0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))))
            : Text(asset.symbol.isNotEmpty ? asset.symbol[0] : '?',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      title: Text(asset.symbol, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      subtitle: asset.name.isNotEmpty ? Text(asset.name, style: const TextStyle(color: AppColors.textSecond, fontSize: 12)) : null,
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            asset.price != null ? _fmtPrice(asset.price!) : '—',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
          ),
          if (change != null)
            Text(
              '${isPos ? '+' : ''}${change.toStringAsFixed(2)}%',
              style: TextStyle(color: changeColor, fontSize: 12),
            ),
        ],
      ),
      onLongPress: onDelete,
    );
  }

  static String _fmtPrice(double p) {
    if (p >= 1000) return '\$${p.toStringAsFixed(2).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
    if (p >= 1) return '\$${p.toStringAsFixed(2)}';
    if (p >= 0.01) return '\$${p.toStringAsFixed(4)}';
    return '\$${p.toStringAsFixed(8)}';
  }
}
