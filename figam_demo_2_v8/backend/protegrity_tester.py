import http.client
import base64
import os
from typing import Tuple

HOST = "pty-emp-api.awse1.anthem.com"
AUTH = os.getenv("PROTEGRITY_AUTH", "Basic U1JDX1BFUF9IUkxBS0U6Q3puWk87S305NWV8dUUuVmhDW0R0S3khTg==")
TIMEOUT = 15


def make_conn() -> http.client.HTTPSConnection:
    return http.client.HTTPSConnection(HOST, timeout=TIMEOUT)


def encrypt(payload: bytes) -> bytes:
    """Calls the Protegrity protect endpoint and returns raw encrypted bytes.
    The caller can base64-encode as needed for transport.
    """
    conn = make_conn()
    headers = {
        "Authorization": AUTH,
        "Content-Type": "application/octet-stream",
    }
    conn.request("POST", "/static/protect/aes256", payload, headers)
    res = conn.getresponse()
    data = res.read()
    if res.status != 200:
        raise RuntimeError(f"Encryption failed: HTTP {res.status}: {data[:200]!r}")
    return data


def decrypt(enc_bytes: bytes) -> bytes:
    """Calls the Protegrity unprotect endpoint and returns the decrypted bytes."""
    conn = make_conn()
    headers = {
        "Authorization": AUTH,
        "Content-Type": "application/octet-stream",
    }
    conn.request("POST", "/static/unprotect/aes256", enc_bytes, headers)
    res = conn.getresponse()
    data = res.read()
    if res.status != 200:
        raise RuntimeError(f"Decryption failed: HTTP {res.status}: {data[:200]!r}")
    return data


def make_test_payload(length: int = 2500, include_commas: bool = True, include_newlines: bool = True) -> str:
    base = "Here is the length content needs to be encrypted with Protegrity"
    # Expand to requested length
    while len(base) < length:
        base += ", sample, line" if include_commas else " sample line"
        if include_newlines:
            base += "\nMore details...\n"
        else:
            base += " More details... "
    return base[:length]


def comma_safe_encode(text: str) -> str:
    """Replace commas with '|' prior to encryption for systems where commas break parsing."""
    return text.replace(",", "|")


def comma_safe_decode(text: str) -> str:
    """Restore '|' back to commas after decryption."""
    return text.replace("|", ",")


def run_tests(do_network: bool = True) -> None:
    # 1) Baseline payloads
    small_payload = "Here is the length content needs to be encrypted with Protegrity"
    large_payload = make_test_payload(2500, include_commas=True, include_newlines=True)
    edge_payload = "First line, with commas, and newlines\nSecond line, more commas, values, fields\nThird line..."

    for name, payload in [("small", small_payload), ("large", large_payload), ("edge", edge_payload)]:
        print(f"\n=== Test: {name} ===")
        print(f"Payload length: {len(payload)} chars")

        # Raw mode
        try:
            if do_network:
                enc_raw = encrypt(payload.encode("utf-8"))
                enc_b64 = base64.b64encode(enc_raw).decode("ascii")
                dec_raw = decrypt(base64.b64decode(enc_b64)).decode("utf-8", errors="replace")
            else:
                # Offline simulation: use base64 as a stand-in to prove flow
                enc_b64 = base64.b64encode(payload.encode("utf-8")).decode("ascii")
                dec_raw = base64.b64decode(enc_b64).decode("utf-8")
            print("Raw encrypt -> decrypt roundtrip OK:", dec_raw[:120].replace("\n", "\\n"), "...")
            assert dec_raw == payload
        except Exception as e:
            print("Raw mode failed:", e)

        # Comma-safe mode
        safe_src = comma_safe_encode(payload)
        try:
            if do_network:
                enc_raw = encrypt(safe_src.encode("utf-8"))
                enc_b64 = base64.b64encode(enc_raw).decode("ascii")
                dec_safe = decrypt(base64.b64decode(enc_b64)).decode("utf-8", errors="replace")
            else:
                enc_b64 = base64.b64encode(safe_src.encode("utf-8")).decode("ascii")
                dec_safe = base64.b64decode(enc_b64).decode("utf-8")
            restored = comma_safe_decode(dec_safe)
            print("Comma-safe roundtrip OK:", restored[:120].replace("\n", "\\n"), "...")
            assert restored == payload
        except Exception as e:
            print("Comma-safe mode failed:", e)


if __name__ == "__main__":
    # Toggle network use with env var. Default True; set PROTEGRITY_OFFLINE=1 to disable.
    offline = os.getenv("PROTEGRITY_OFFLINE", "0") == "1"
    run_tests(do_network=not offline)
