import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../models/wallet.dart';
import '../../services/api_service.dart';
import '../../main.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<Wallet> _wallets = [];
  List<dynamic> _manual = [];
  List<FlSpot> _chartSpots = [];
  double _grandTotal = 0;
  double _change24h = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final futures = await Future.wait([
        ApiService.getDashWallets(),
        ApiService.getDashManual(),
        ApiService.getDashChart(period: '1D'),
      ]);
      final wallets = (futures[0] as List).map((j) => Wallet.fromJson(j as Map<String, dynamic>)).toList();
      final manual = futures[1] as List;
      final chartData = futures[2] as Map<String, dynamic>;

      final pts = (chartData['points'] as List? ?? []);
      final spots = <FlSpot>[];
      for (var i = 0; i < pts.length; i++) {
        final v = (pts[i]['v'] as num?)?.toDouble();
        if (v != null) spots.add(FlSpot(i.toDouble(), v));
      }

      double total = 0;
      for (final w in wallets) total += w.totalUsd;
      for (final a in manual) {
        total += ((a['balance'] as num?)?.toDouble() ?? 0) * ((a['price_usd'] as num?)?.toDouble() ?? 0);
      }

      double change = 0;
      if (spots.length >= 2) {
        final first = spots.first.y;
        final last = spots.last.y;
        if (first > 0) change = ((last - first) / first) * 100;
      }

      if (mounted) setState(() {
        _wallets = wallets;
        _manual = manual;
        _chartSpots = spots;
        _grandTotal = total;
        _change24h = change;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Dashboard', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.background,
        elevation: 0,
        actions: [IconButton(icon: const Icon(Icons.refresh, color: AppColors.textSecond), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
          : _error != null
              ? _errorView()
              : RefreshIndicator(color: AppColors.accent, onRefresh: _load, child: _body()),
    );
  }

  Widget _errorView() => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.wifi_off, color: AppColors.textSecond, size: 48),
      const SizedBox(height: 12),
      const Text('Servidor indisponível', style: TextStyle(color: Colors.white)),
      const SizedBox(height: 4),
      Text(_error!, style: const TextStyle(color: AppColors.textSecond, fontSize: 11), textAlign: TextAlign.center),
      const SizedBox(height: 16),
      ElevatedButton(onPressed: _load, style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.black), child: const Text('Tentar novamente')),
    ]),
  );

  Widget _body() => ListView(
    padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
    children: [
      const SizedBox(height: 8),
      _PortfolioHero(total: _grandTotal, change24h: _change24h, spots: _chartSpots),
      const SizedBox(height: 20),
      if (_wallets.isEmpty && _manual.isEmpty) ...[
        const SizedBox(height: 40),
        const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.account_balance_wallet_outlined, color: AppColors.textSecond, size: 48),
          SizedBox(height: 12),
          Text('Nenhuma carteira adicionada', style: TextStyle(color: Colors.white)),
          SizedBox(height: 4),
          Text('Acesse o app web para adicionar carteiras', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
        ])),
      ] else ...[
        if (_wallets.isNotEmpty) ...[
          _sectionLabel('Carteiras On-Chain'),
          const SizedBox(height: 8),
          ..._wallets.map((w) => _WalletCard(wallet: w, onRefresh: () => _refreshWallet(w.address))),
        ],
        if (_manual.isNotEmpty) ...[
          const SizedBox(height: 16),
          _sectionLabel('Ativos Manuais'),
          const SizedBox(height: 8),
          ..._manual.map((a) => _ManualAssetTile(asset: a as Map<String, dynamic>)),
        ],
      ],
    ],
  );

  Future<void> _refreshWallet(String address) async {
    try {
      await ApiService.refreshDashWallet(address);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red));
    }
  }

  Widget _sectionLabel(String t) => Text(t.toUpperCase(),
      style: const TextStyle(color: AppColors.textSecond, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1.2));
}

// ── Portfolio hero card ────────────────────────────────────────────────────────

class _PortfolioHero extends StatelessWidget {
  final double total;
  final double change24h;
  final List<FlSpot> spots;
  const _PortfolioHero({required this.total, required this.change24h, required this.spots});

  @override
  Widget build(BuildContext context) {
    final isPos = change24h >= 0;
    final changeColor = isPos ? AppColors.positive : AppColors.negative;

    return Card(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Portfólio Total', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
            const SizedBox(height: 4),
            Text(
              total > 0 ? '\$${_fmtUsd(total)}' : '—',
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(
              '${isPos ? '+' : ''}${change24h.toStringAsFixed(2)}% 24h',
              style: TextStyle(color: changeColor, fontSize: 13, fontWeight: FontWeight.w500),
            ),
            if (spots.length >= 2) ...[
              const SizedBox(height: 16),
              SizedBox(
                height: 70,
                child: LineChart(
                  LineChartData(
                    gridData: const FlGridData(show: false),
                    titlesData: const FlTitlesData(show: false),
                    borderData: FlBorderData(show: false),
                    lineTouchData: const LineTouchData(enabled: false),
                    lineBarsData: [
                      LineChartBarData(
                        spots: spots,
                        isCurved: true,
                        color: changeColor,
                        barWidth: 2,
                        dotData: const FlDotData(show: false),
                        belowBarData: BarAreaData(
                          show: true,
                          color: changeColor.withOpacity(0.1),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static String _fmtUsd(double v) {
    if (v >= 1e9) return '${(v / 1e9).toStringAsFixed(2)}B';
    if (v >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}M';
    if (v >= 1000) {
      final s = v.toStringAsFixed(2);
      return s.replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
    }
    return v.toStringAsFixed(2);
  }
}

// ── Wallet card ───────────────────────────────────────────────────────────────

class _WalletCard extends StatelessWidget {
  final Wallet wallet;
  final VoidCallback onRefresh;
  const _WalletCard({required this.wallet, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.surface,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ExpansionTile(
        collapsedBackgroundColor: Colors.transparent,
        backgroundColor: Colors.transparent,
        iconColor: AppColors.textSecond,
        collapsedIconColor: AppColors.textSecond,
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: AppColors.surfaceHigh,
          child: Text(wallet.chain.isNotEmpty ? wallet.chain[0] : 'W',
              style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 12)),
        ),
        title: Text(
          wallet.label.isNotEmpty ? wallet.label : _shortAddr(wallet.address),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(wallet.chain.toUpperCase(), style: const TextStyle(color: AppColors.textSecond, fontSize: 11)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('\$${wallet.totalUsd.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
              Text('${wallet.tokens.length} tokens', style: const TextStyle(color: AppColors.textSecond, fontSize: 11)),
            ]),
            const SizedBox(width: 4),
            const Icon(Icons.expand_more, color: AppColors.textSecond, size: 20),
          ],
        ),
        children: [
          const Divider(color: AppColors.divider, height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Row(children: [
              Expanded(child: Text(_shortAddr(wallet.address), style: const TextStyle(color: AppColors.textSecond, fontSize: 11))),
              TextButton.icon(
                icon: const Icon(Icons.refresh, size: 14),
                label: const Text('Atualizar', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: AppColors.accent),
                onPressed: onRefresh,
              ),
            ]),
          ),
          ...wallet.tokens.take(20).map((t) => ListTile(
            dense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
            leading: CircleAvatar(
              radius: 12, backgroundColor: AppColors.surfaceHigh,
              child: Text(t.symbol.isNotEmpty ? t.symbol[0] : '?', style: const TextStyle(color: Colors.white, fontSize: 10)),
            ),
            title: Text('${t.symbol}  ${t.balance > 0 ? _fmtBal(t.balance) : ''}',
                style: const TextStyle(color: Colors.white, fontSize: 13)),
            trailing: Text('\$${t.valueUsd.toStringAsFixed(2)}',
                style: const TextStyle(color: AppColors.textSecond, fontSize: 12)),
          )),
          if (wallet.tokens.length > 20)
            Padding(
              padding: const EdgeInsets.only(bottom: 8, left: 16),
              child: Text('+ ${wallet.tokens.length - 20} tokens', style: const TextStyle(color: AppColors.textSecond, fontSize: 12)),
            ),
        ],
      ),
    );
  }

  static String _shortAddr(String a) => a.length > 12 ? '${a.substring(0, 6)}…${a.substring(a.length - 4)}' : a;
  static String _fmtBal(double v) => v >= 1000 ? v.toStringAsFixed(0) : v >= 1 ? v.toStringAsFixed(2) : v.toStringAsFixed(4);
}

// ── Manual asset tile ─────────────────────────────────────────────────────────

class _ManualAssetTile extends StatelessWidget {
  final Map<String, dynamic> asset;
  const _ManualAssetTile({required this.asset});

  @override
  Widget build(BuildContext context) {
    final sym = (asset['symbol'] ?? asset['name'] ?? '?').toString();
    final bal = (asset['balance'] as num?)?.toDouble() ?? 0;
    final price = (asset['price_usd'] as num?)?.toDouble() ?? 0;
    final value = bal * price;
    return Card(
      color: AppColors.surface,
      margin: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        leading: CircleAvatar(
          radius: 18, backgroundColor: AppColors.surfaceHigh,
          child: Text(sym[0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
        title: Text(sym, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        subtitle: Text('${bal.toStringAsFixed(4)} @ \$${price.toStringAsFixed(2)}',
            style: const TextStyle(color: AppColors.textSecond, fontSize: 12)),
        trailing: Text('\$${value.toStringAsFixed(2)}',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
