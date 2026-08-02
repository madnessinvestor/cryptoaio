class Trade {
  final int idx;
  final String side; // 'buy' | 'sell'
  final double qty;
  final double price;
  final double? fee;
  final String? date;
  final String? note;

  Trade({
    required this.idx,
    required this.side,
    required this.qty,
    required this.price,
    this.fee,
    this.date,
    this.note,
  });

  factory Trade.fromJson(Map<String, dynamic> j, int index) => Trade(
        idx: index,
        side: j['side'] ?? 'buy',
        qty: (j['qty'] as num?)?.toDouble() ?? 0,
        price: (j['price'] as num?)?.toDouble() ?? 0,
        fee: (j['fee'] as num?)?.toDouble(),
        date: j['date'],
        note: j['note'],
      );
}

class PortfolioTicker {
  final String symbol;
  final String name;
  final List<Trade> trades;
  final double? currentPrice;
  final double? pnl;
  final double? pnlPct;
  final double totalQty;
  final double avgCost;

  PortfolioTicker({
    required this.symbol,
    this.name = '',
    this.trades = const [],
    this.currentPrice,
    this.pnl,
    this.pnlPct,
    this.totalQty = 0,
    this.avgCost = 0,
  });

  factory PortfolioTicker.fromJson(Map<String, dynamic> j) {
    final rawTrades = (j['trades'] as List? ?? []);
    final trades = rawTrades
        .asMap()
        .entries
        .map((e) => Trade.fromJson(e.value as Map<String, dynamic>, e.key))
        .toList();
    return PortfolioTicker(
      symbol: (j['symbol'] ?? j['ticker'] ?? '').toString().toUpperCase(),
      name: j['name'] ?? '',
      trades: trades,
      currentPrice: (j['current_price'] as num?)?.toDouble(),
      pnl: (j['pnl'] as num?)?.toDouble(),
      pnlPct: (j['pnl_pct'] as num?)?.toDouble(),
      totalQty: (j['total_qty'] as num?)?.toDouble() ?? 0,
      avgCost: (j['avg_cost'] as num?)?.toDouble() ?? 0,
    );
  }
}
