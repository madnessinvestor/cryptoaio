import 'package:flutter/material.dart';
import '../../config/api_config.dart';
import '../../services/api_service.dart';
import '../../main.dart';

class ConfigScreen extends StatefulWidget {
  const ConfigScreen({super.key});
  @override
  State<ConfigScreen> createState() => _ConfigScreenState();
}

class _ConfigScreenState extends State<ConfigScreen> {
  late final TextEditingController _urlCtrl;
  bool _testing = false;
  String? _status;
  bool? _online;

  @override
  void initState() {
    super.initState();
    _urlCtrl = TextEditingController(text: ApiConfig.baseUrl);
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveAndTest() async {
    setState(() { _testing = true; _status = null; });
    await ApiConfig.save(_urlCtrl.text.trim());
    final ok = await ApiService.ping();
    setState(() {
      _testing = false;
      _online = ok;
      _status = ok ? '✅ Conectado com sucesso!' : '❌ Não foi possível conectar. Verifique a URL.';
    });
  }

  Future<void> _factoryReset() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Limpar App?', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Isso apagará TODOS os seus dados: Watchlist, Dashboard, Trade, Alertas e configurações.\n\nEssa ação não pode ser desfeita.',
          style: TextStyle(color: AppColors.textSecond),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('🗑️ Apagar tudo', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await ApiService.resetData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ App resetado com sucesso.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Config', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.background,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Server URL ──────────────────────────────────────────────────────
          _sectionHeader('Servidor Flask'),
          Card(
            color: AppColors.surface,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'URL base do servidor CryptoAIO',
                    style: TextStyle(color: AppColors.textSecond, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _urlCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'https://meu-app.replit.app',
                      hintStyle: const TextStyle(color: AppColors.textSecond),
                      filled: true,
                      fillColor: AppColors.surfaceHigh,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide.none,
                      ),
                      suffixIcon: _testing
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          : null,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_status != null)
                    Text(_status!, style: TextStyle(color: _online == true ? Colors.green : Colors.red, fontSize: 12)),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _testing ? null : _saveAndTest,
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.black),
                      child: const Text('Salvar e testar conexão', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '• Android físico: URL do Replit deployed (ex: https://xxx.replit.app)\n'
                    '• Emulador Android: http://10.0.2.2:5000\n'
                    '• Windows/Web: http://localhost:5000',
                    style: TextStyle(color: AppColors.textSecond, fontSize: 11),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Dados ───────────────────────────────────────────────────────────
          _sectionHeader('Dados'),
          Card(
            color: AppColors.surface,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.download_outlined, color: AppColors.accent),
                  title: const Text('Exportar dados', style: TextStyle(color: Colors.white)),
                  subtitle: const Text('Baixar todos os dados em JSON', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
                  onTap: () async {
                    try {
                      final data = await ApiService.exportData();
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('✅ ${data.keys.length} seções exportadas'), backgroundColor: Colors.green),
                        );
                      }
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red));
                    }
                  },
                ),
                const Divider(color: AppColors.divider, height: 1),
                ListTile(
                  leading: const Icon(Icons.delete_forever_outlined, color: Colors.red),
                  title: const Text('Limpar App (Reset de Fábrica)', style: TextStyle(color: Colors.red)),
                  subtitle: const Text('Apaga todos os dados permanentemente', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
                  onTap: _factoryReset,
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ── Sobre ───────────────────────────────────────────────────────────
          _sectionHeader('Sobre'),
          Card(
            color: AppColors.surface,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.currency_bitcoin, color: Colors.black, size: 20),
                    ),
                    const SizedBox(width: 12),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('CryptoAIO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('All-in-One Crypto Tracker', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
                      ],
                    ),
                  ]),
                  const SizedBox(height: 12),
                  const Text('Frontend Flutter para o backend Python/Flask.', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) => Padding(
    padding: const EdgeInsets.only(bottom: 8, left: 4),
    child: Text(title.toUpperCase(),
        style: const TextStyle(color: AppColors.textSecond, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1.2)),
  );
}
