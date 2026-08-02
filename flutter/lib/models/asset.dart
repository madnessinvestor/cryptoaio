class Asset {
  final String symbol;
  final String name;
  final double? price;
  final double? change24h;
  final String? iconUrl;

  Asset({
    required this.symbol,
    this.name = '',
    this.price,
    this.change24h,
    this.iconUrl,
  });

  factory Asset.fromJson(Map<String, dynamic> j) => Asset(
        symbol: (j['symbol'] ?? '').toString().toUpperCase(),
        name: j['name'] ?? '',
        price: (j['price'] as num?)?.toDouble(),
        change24h: (j['change_24h'] as num?)?.toDouble(),
        iconUrl: j['icon_url'],
      );

  Asset copyWith({double? price, double? change24h}) => Asset(
        symbol: symbol,
        name: name,
        price: price ?? this.price,
        change24h: change24h ?? this.change24h,
        iconUrl: iconUrl,
      );
}
