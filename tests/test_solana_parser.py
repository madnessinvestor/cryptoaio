"""
Unit tests for the refactored Solana transaction swap parser (_lookup_solana).

Each test mocks _tx_post (RPC), _sol_mint_symbol (Jupiter token API), and
_sol_hist_price (historical USD price) so no network calls are made.

Cases covered:
  - USDC  → BONK   (stable → token)
  - BONK  → USDC   (token  → stable)
  - BONK  → SOL    (token  → native SOL)
  - SOL   → BONK   (native SOL → token)
  - BONK  → JUP    (token  → token)
  - JUP   → BONK   (token  → token, reversed)
  - Multi-hop BONK → JUP  (via intermediate pool accounts that should be filtered)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import unittest
from unittest.mock import patch, MagicMock

import app as _app_module
from app import app


# ── Fixture helpers ────────────────────────────────────────────────────────────

WALLET   = "UserWallet1111111111111111111111111111111111"
POOL_ACC = "PoolAccount111111111111111111111111111111111"

USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
JUP_MINT  = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"

def _tx(account_keys, pre_token, post_token, pre_bals, post_bals, fee=5000,
        block_time=1_700_000_000):
    """Build a minimal jsonParsed getTransaction response."""
    return {
        "result": {
            "blockTime": block_time,
            "meta": {
                "fee": fee,
                "preTokenBalances":  pre_token,
                "postTokenBalances": post_token,
                "preBalances":       pre_bals,
                "postBalances":      post_bals,
            },
            "transaction": {
                "message": {
                    "accountKeys": [
                        {"pubkey": k, "signer": i == 0, "writable": True}
                        for i, k in enumerate(account_keys)
                    ]
                }
            },
        }
    }

def _token_bal(account_index, owner, mint, amount):
    return {
        "accountIndex": account_index,
        "owner": owner,
        "mint":  mint,
        "uiTokenAmount": {"uiAmount": amount, "decimals": 6},
    }

def _sym_map(**kwargs):
    """Return a side_effect function for _sol_mint_symbol from a mint→symbol dict."""
    def _f(mint, timeout=5):
        return kwargs.get(mint)
    return _f

def _parse(tx_mock, mint_map=None, hist_price=None):
    """
    Call _lookup_solana with mocked dependencies.
    Returns the parsed JSON dict or raises AssertionError if not 200.
    """
    sym_side_effect = _sym_map(**(mint_map or {}))
    hist_side = hist_price if hist_price is not None else (lambda sym, ts: (None, False))

    with patch.object(_app_module, "_tx_post", return_value=tx_mock), \
         patch.object(_app_module, "_sol_mint_symbol", side_effect=sym_side_effect), \
         patch.object(_app_module, "_sol_hist_price",  side_effect=hist_side):
        with app.test_request_context("/api/tx-lookup?hash=FAKEHASH"):
            resp = _app_module._lookup_solana("FAKEHASH")

    # _lookup_solana returns either a Response or (Response, status) tuple
    if isinstance(resp, tuple):
        response, status = resp
        assert status == 200, f"Expected 200, got {status}. Body: {response.get_data(as_text=True)}"
    else:
        response = resp

    return json.loads(response.get_data(as_text=True))


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestSolanaParser(unittest.TestCase):

    # ── 1. USDC → BONK (stable → token) ───────────────────────────────────────
    def test_usdc_to_bonk(self):
        tx = _tx(
            account_keys=[WALLET, "Pool1", "Pool2"],
            pre_token=[
                _token_bal(0, WALLET, USDC_MINT, 100.0),   # user's USDC: will be spent
            ],
            post_token=[
                _token_bal(0, WALLET, USDC_MINT,  0.0),    # USDC gone
                _token_bal(1, WALLET, BONK_MINT,  50_000.0), # BONK received
                # Pool account — must be ignored
                _token_bal(2, POOL_ACC, BONK_MINT, 999_000.0),
            ],
            pre_bals=[1_000_000_000, 0, 0],
            post_bals=[  999_995_000, 0, 0],
        )
        data = _parse(tx,
                      mint_map={BONK_MINT: "BONK", USDC_MINT: "USDC"},
                      hist_price=lambda sym, ts: (1.0 if sym == "USDC" else (0.000002, False)))

        self.assertTrue(data.get("is_swap"))
        self.assertEqual(data["ticker"],      "BONK")
        self.assertAlmostEqual(data["qty"],    50_000.0)
        self.assertEqual(data["from_ticker"], "USDC")
        self.assertAlmostEqual(data["from_qty"], 100.0)
        self.assertIsNotNone(data.get("total_usd"))

    # ── 2. BONK → USDC (token → stable) ───────────────────────────────────────
    def test_bonk_to_usdc(self):
        tx = _tx(
            account_keys=[WALLET],
            pre_token=[
                _token_bal(0, WALLET, BONK_MINT, 50_000.0),
            ],
            post_token=[
                _token_bal(0, WALLET, BONK_MINT,      0.0),
                _token_bal(1, WALLET, USDC_MINT,    100.0),
            ],
            pre_bals=[1_000_000_000],
            post_bals=[  999_995_000],
        )
        data = _parse(tx, mint_map={BONK_MINT: "BONK", USDC_MINT: "USDC"})

        self.assertTrue(data.get("is_swap"))
        self.assertEqual(data["ticker"],      "USDC")
        self.assertAlmostEqual(data["qty"],    100.0)
        self.assertEqual(data["from_ticker"], "BONK")
        self.assertAlmostEqual(data["from_qty"], 50_000.0)

    # ── 3. BONK → SOL (token → native SOL) ────────────────────────────────────
    def test_bonk_to_sol(self):
        # BONK ATA decreases; WSOL doesn't appear; native SOL increases
        tx = _tx(
            account_keys=[WALLET],
            pre_token=[
                _token_bal(0, WALLET, BONK_MINT, 50_000.0),
            ],
            post_token=[
                _token_bal(0, WALLET, BONK_MINT, 0.0),
            ],
            pre_bals=[1_000_000_000],               # 1 SOL before
            post_bals=[1_500_000_000],              # 1.5 SOL after (received 0.5 SOL)
            fee=5_000,
        )
        data = _parse(tx, mint_map={BONK_MINT: "BONK"})

        self.assertTrue(data.get("is_swap"))
        self.assertEqual(data["from_ticker"], "BONK")
        self.assertAlmostEqual(data["from_qty"], 50_000.0)
        self.assertEqual(data["ticker"], "SOL")
        # fee-adjusted: (1_500_000_000 - 1_000_000_000 + 5_000) / 1e9 ≈ 0.500005
        self.assertGreater(data["qty"], 0.4999)
        self.assertLess(data["qty"],    0.5001)

    # ── 4. SOL → BONK (native SOL → token) ────────────────────────────────────
    def test_sol_to_bonk(self):
        # No WSOL in token balances; native SOL decreases; BONK ATA increases
        tx = _tx(
            account_keys=[WALLET],
            pre_token=[],
            post_token=[
                _token_bal(0, WALLET, BONK_MINT, 50_000.0),
            ],
            pre_bals=[1_000_000_000],
            post_bals=[  500_000_000],   # spent 0.5 SOL (net of fee)
            fee=5_000,
        )
        data = _parse(tx, mint_map={BONK_MINT: "BONK"})

        self.assertTrue(data.get("is_swap"))
        self.assertEqual(data["ticker"],      "BONK")
        self.assertAlmostEqual(data["qty"],    50_000.0)
        self.assertEqual(data["from_ticker"], "SOL")
        # fee-adjusted: (500_000_000 - 1_000_000_000 + 5_000) / 1e9 ≈ -0.499995
        self.assertGreater(data["from_qty"], 0.4999)
        self.assertLess(data["from_qty"],    0.5001)

    # ── 5. BONK → JUP (token → token) ─────────────────────────────────────────
    def test_bonk_to_jup(self):
        tx = _tx(
            account_keys=[WALLET],
            pre_token=[
                _token_bal(0, WALLET, BONK_MINT, 50_000.0),
            ],
            post_token=[
                _token_bal(0, WALLET, BONK_MINT,  0.0),
                _token_bal(1, WALLET, JUP_MINT,  25.0),
            ],
            pre_bals=[1_000_000_000],
            post_bals=[  999_995_000],
            fee=5_000,
        )
        data = _parse(tx, mint_map={BONK_MINT: "BONK", JUP_MINT: "JUP"})

        self.assertTrue(data.get("is_swap"))
        self.assertEqual(data["ticker"],       "JUP")
        self.assertAlmostEqual(data["qty"],     25.0)
        self.assertEqual(data["from_ticker"],  "BONK")
        self.assertAlmostEqual(data["from_qty"], 50_000.0)

    # ── 6. JUP → BONK (token → token, reversed) ───────────────────────────────
    def test_jup_to_bonk(self):
        tx = _tx(
            account_keys=[WALLET],
            pre_token=[
                _token_bal(0, WALLET, JUP_MINT,   25.0),
            ],
            post_token=[
                _token_bal(0, WALLET, JUP_MINT,    0.0),
                _token_bal(1, WALLET, BONK_MINT, 50_000.0),
            ],
            pre_bals=[1_000_000_000],
            post_bals=[  999_995_000],
            fee=5_000,
        )
        data = _parse(tx, mint_map={BONK_MINT: "BONK", JUP_MINT: "JUP"})

        self.assertTrue(data.get("is_swap"))
        self.assertEqual(data["ticker"],      "BONK")
        self.assertAlmostEqual(data["qty"],    50_000.0)
        self.assertEqual(data["from_ticker"], "JUP")
        self.assertAlmostEqual(data["from_qty"], 25.0)

    # ── 7. Multi-hop BONK → JUP (via SOL as intermediate in pool accounts) ─────
    def test_multihop_bonk_to_jup(self):
        """Pool accounts move intermediate SOL — they must be filtered out.
        The user's wallet only sees BONK leave and JUP arrive."""
        POOL_WSOL_ACC = "PoolWSOL1111111111111111111111111111111111"

        tx = _tx(
            account_keys=[WALLET, POOL_WSOL_ACC, "Pool2"],
            pre_token=[
                _token_bal(0, WALLET,        BONK_MINT, 50_000.0),
                # Pool's WSOL account — must be ignored (different owner)
                _token_bal(1, POOL_WSOL_ACC, _app_module._WSOL_MINT, 0.0),
            ],
            post_token=[
                _token_bal(0, WALLET,        BONK_MINT,    0.0),
                _token_bal(2, WALLET,        JUP_MINT,    25.0),
                # Pool WSOL intermediate — must be ignored
                _token_bal(1, POOL_WSOL_ACC, _app_module._WSOL_MINT, 100.0),
            ],
            pre_bals=[1_000_000_000, 0, 0],
            post_bals=[  999_995_000, 100_000_000, 0],
            fee=5_000,
        )
        data = _parse(tx, mint_map={BONK_MINT: "BONK", JUP_MINT: "JUP"})

        # Only user's BONK→JUP should appear; pool WSOL noise filtered
        self.assertTrue(data.get("is_swap"))
        self.assertEqual(data["ticker"],      "JUP")
        self.assertAlmostEqual(data["qty"],    25.0)
        self.assertEqual(data["from_ticker"], "BONK")
        self.assertAlmostEqual(data["from_qty"], 50_000.0)

    # ── Extra: USD null when price is unavailable (no failure) ────────────────
    def test_usd_null_when_no_price(self):
        """Import must succeed even when neither leg can be priced."""
        tx = _tx(
            account_keys=[WALLET],
            pre_token=[_token_bal(0, WALLET, BONK_MINT, 50_000.0)],
            post_token=[
                _token_bal(0, WALLET, BONK_MINT,    0.0),
                _token_bal(1, WALLET, JUP_MINT,    25.0),
            ],
            pre_bals=[1_000_000_000],
            post_bals=[  999_995_000],
        )
        data = _parse(tx,
                      mint_map={BONK_MINT: "BONK", JUP_MINT: "JUP"},
                      hist_price=lambda sym, ts: (None, False))  # no price available

        self.assertTrue(data.get("is_swap"))
        self.assertIsNone(data.get("total_usd"))
        # Trade data should still be complete
        self.assertEqual(data["ticker"],      "JUP")
        self.assertEqual(data["from_ticker"], "BONK")

    # ── Extra: WSOL token account present (explicit wrapped-SOL leg) ──────────
    def test_wsol_in_token_balances(self):
        """When a WSOL ATA appears in the user's token balances, use it
        instead of the native SOL delta to avoid double-counting."""
        tx = _tx(
            account_keys=[WALLET],
            pre_token=[
                _token_bal(0, WALLET, _app_module._WSOL_MINT, 0.5),  # WSOL present
            ],
            post_token=[
                _token_bal(0, WALLET, _app_module._WSOL_MINT, 0.0),
                _token_bal(1, WALLET, BONK_MINT, 50_000.0),
            ],
            pre_bals=[1_000_000_000],
            post_bals=[  499_995_000],   # also decreases (from wrapping)
            fee=5_000,
        )
        data = _parse(tx, mint_map={BONK_MINT: "BONK"})

        self.assertTrue(data.get("is_swap"))
        self.assertEqual(data["from_ticker"], "SOL")
        self.assertAlmostEqual(data["from_qty"], 0.5)
        self.assertEqual(data["ticker"], "BONK")
        self.assertAlmostEqual(data["qty"], 50_000.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
