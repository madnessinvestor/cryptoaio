import 'package:flutter/material.dart';
import '../../models/trade.dart';
import '../../services/api_service.dart';
import '../../main.dart';

class TradeScreen extends StatefulWidget {
  const TradeScreen({super.key});
  @override
  State<TradeScreen> createState() => _TradeScreenState();
}

class _TradeScreenState extends State<TradeScreen> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<PortfolioTicker> _tickers = [];
  bool _loading = true;
  String? _error;
  double _totalPnl = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final raw = await ApiService.getPortfolio();
      final tickers = raw.map((j) => PortfolioTicker.fromJson(j as Map<String, dynamic>)).toList();
      double total = 0;
      for (final t in tickers) { if (t.pnl != null) total += t.pnl!; }
      if (mounted) setState(() { _tickers = tickers; _totalPnl = total; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _addTrade() async {
    final symCtrl = TextEditingController();
    final qtyCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    String side = 'buy';
    final dateCtrl = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 10));

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
            children: [
              const Text('Novo Trade', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: TextField(
                  controller: symCtrl,
                  style: const TextStyle(color: Colors.white),
                  textCapitalization: TextCapitalization.characters,
                  decoration: _inputDeco('Símbolo'),
                )),
                const SizedBox(width: 12),
                ToggleButtons(
                  isSelected: [side == 'buy', side == 'sell'],
                  onPressed: (i) => setSt(() => side = i == 0 ? 'buy' : 'sell'),
                  borderRadius: BorderRadius.circular(8),
                  selectedColor: Colors.black,
                  fillColor: side == 'buy' ? AppColors.positive : AppColors.negative,
                  color: AppColors.textSecond,
                  constraints: const BoxConstraints(minWidth: 64, minHeight: 40),
                  children: const [Text('Compra'), Text('Venda')],
                ),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: TextField(
                  controller: qtyCtrl,
                  style: const TextStyle(color: Colors.white),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: _inputDeco('Quantidade'),
                )),
                const SizedBox(width: 12),
                Expanded(child: TextField(
                  controller: priceCtrl,
                  style: const TextStyle(color: Colors.white),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: _inputDeco('Preço (USD)'),
                )),
              ]),
              const SizedBox(height: 12),
              TextField(
                controller: dateCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: _inputDeco('Data (YYYY-MM-DD)'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final sym = symCtrl.text.trim().toUpperCase();
                    final qty = double.tryParse(qtyCtrl.text.replaceAll(',', '.'));
                    final price = double.tryParse(priceCtrl.text.replaceAll(',', '.'));
                    if (sym.isEmpty || qty == null || price == null) return;
                    Navigator.pop(ctx);
                    try {
                      await ApiService.addTrade({
                        'symbol': sym, 'side': side,
                        'qty': qty, 'price': price,
                        'date': dateCtrl.text.trim(),
                      });
                      await _load();
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red));
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.black),
                  child: const Text('Registrar trade', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  static InputDecoration _inputDeco(String hint) => InputDecoration(
    hintText: hint, hintStyle: const TextStyle(color: AppColors.textSecond),
    filled: true, fillColor: AppColors.surfaceHigh,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
  );

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Trade', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.background,
        elevation: 0,
        actions: [IconButton(icon: const Icon(Icons.refresh, color: AppColors.textSecond), onPressed: _load)],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addTrade,
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.black,
        child: const Icon(Icons.add),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.accent));
    if (_error != null) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center)));
    if (_tickers.isEmpty) return const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.swap_vert, color: AppColors.textSecond, size: 48),
      SizedBox(height: 12),
      Text('Nenhum trade registrado', style: TextStyle(color: Colors.white)),
      SizedBox(height: 4),
      Text('Toque em + para registrar', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
    ]));
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 80),
        children: [
          // Summary card
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Card(
              color: AppColors.surface,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('P&L Total', style: TextStyle(color: AppColors.textSecond, fontSize: 13)),
                  Text(
                    '${_totalPnl >= 0 ? '+' : ''}\$${_totalPnl.toStringAsFixed(2)}',
                    style: TextStyle(
                      color: _totalPnl >= 0 ? AppColors.positive : AppColors.negative,
                      fontWeight: FontWeight.bold, fontSize: 16,
                    ),
                  ),
                ]),
              ),
            ),
          ),
          const Divider(color: AppColors.divider),
          ..._tickers.map((t) => _TickerCard(ticker: t, onDelete: () async {
            await ApiService.deleteTicker(t.symbol);
            await _load();
          })),
        ],
      ),
    );
  }
}

class _TickerCard extends StatelessWidget {
  final PortfolioTicker ticker;
  final VoidCallback onDelete;
  const _TickerCard({required this.ticker, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final pnl = ticker.pnl ?? 0;
    final isPos = pnl >= 0;
    return Card(
      color: AppColors.surface,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ExpansionTile(
        backgroundColor: Colors.transparent,
        collapsedBackgroundColor: Colors.transparent,
        iconColor: AppColors.textSecond,
        collapsedIconColor: AppColors.textSecond,
        leading: CircleAvatar(
          backgroundColor: AppColors.surfaceHigh, radius: 18,
          child: Text(ticker.symbol.isNotEmpty ? ticker.symbol[0] : '?',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
        ),
        title: Text(ticker.symbol, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        subtitle: Text(
          'Qtd: ${ticker.totalQty.toStringAsFixed(4)}  •  Preço médio: \$${ticker.avgCost.toStringAsFixed(2)}',
          style: const TextStyle(color: AppColors.textSecond, fontSize: 11),
        ),
        trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${isPos ? '+' : ''}\$${pnl.toStringAsFixed(2)}',
              style: TextStyle(color: isPos ? AppColors.positive : AppColors.negative, fontWeight: FontWeight.bold, fontSize: 13)),
          if (ticker.pnlPct != null)
            Text('${ticker.pnlPct! >= 0 ? '+' : ''}${ticker.pnlPct!.toStringAsFixed(2)}%',
                style: TextStyle(color: isPos ? AppColors.positive : AppColors.negative, fontSize: 11)),
        ]),
        children: [
          ...ticker.trades.asMap().entries.map((e) {
            final tr = e.value;
            final isBuy = tr.side == 'buy';
            return ListTile(
              dense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              leading: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: (isBuy ? AppColors.positive : AppColors.negative).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(isBuy ? 'COMPRA' : 'VENDA',
                    style: TextStyle(color: isBuy ? AppColors.positive : AppColors.negative, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
              title: Text('${tr.qty.toStringAsFixed(4)} @ \$${tr.price.toStringAsFixed(2)}',
                  style: const TextStyle(color: Colors.white, fontSize: 12)),
              subtitle: tr.date != null ? Text(tr.date!, style: const TextStyle(color: AppColors.textSecond, fontSize: 11)) : null,
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                onPressed: () async {
                  await ApiService.deleteTrade(ticker.symbol, e.key);
                },
              ),
            );
          }),
          ListTile(
            dense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            title: const Text('Remover ativo inteiro', style: TextStyle(color: Colors.red, fontSize: 12)),
            leading: const Icon(Icons.delete_forever, color: Colors.red, size: 18),
            onTap: onDelete,
          ),
        ],
      ),
    );
  }
}
