class WalletToken {
  final String symbol;
  final String name;
  final double balance;
  final double valueUsd;
  final double priceUsd;
  final String? iconUrl;

  WalletToken({
    required this.symbol,
    this.name = '',
    this.balance = 0,
    this.valueUsd = 0,
    this.priceUsd = 0,
    this.iconUrl,
  });

  factory WalletToken.fromJson(Map<String, dynamic> j) => WalletToken(
        symbol: (j['symbol'] ?? '').toUpperCase(),
        name: j['name'] ?? '',
        balance: (j['balance'] as num?)?.toDouble() ?? 0,
        valueUsd: (j['value_usd'] as num?)?.toDouble() ?? 0,
        priceUsd: (j['price_usd'] as num?)?.toDouble() ?? 0,
        iconUrl: j['icon_url'],
      );
}

class Wallet {
  final String address;
  final String label;
  final String chain;
  final double totalUsd;
  final List<WalletToken> tokens;
  final String? lastUpdated;

  Wallet({
    required this.address,
    this.label = '',
    this.chain = '',
    this.totalUsd = 0,
    this.tokens = const [],
    this.lastUpdated,
  });

  factory Wallet.fromJson(Map<String, dynamic> j) {
    final tokens = (j['tokens'] as List? ?? [])
        .map((t) => WalletToken.fromJson(t as Map<String, dynamic>))
        .toList();
    final total = tokens.fold<double>(0, (s, t) => s + t.valueUsd);
    return Wallet(
      address: j['address'] ?? '',
      label: j['label'] ?? '',
      chain: j['chain'] ?? '',
      totalUsd: (j['total_usd'] as num?)?.toDouble() ?? total,
      tokens: tokens,
      lastUpdated: j['last_updated'],
    );
  }
}
