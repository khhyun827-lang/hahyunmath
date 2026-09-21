# 알리고 고정 IP 중계 — Oracle Cloud 상시무료 VM 에 세우기 (2026-09-21)

왜 필요한가 — 알리고 API 는 **등록된 발신 IP** 에서 온 요청만 받는다(`-101 인증오류입니다.-IP`). Cloudflare 워커는
IP 가 고정이 아니어서(09-21에 532번 재어 14개 대역을 등록했는데 다음 호출은 전부 다른 대역이었다) 직접 부를 수 없다.
그래서 **고정 IP 서버 한 대**(이 문서)가 대신 알리고를 부른다. 워커 → 중계(Caddy) → 알리고. 알리고엔 이 서버 IP 하나만 둔다.

중계는 `Caddyfile` 20줄이 전부다 — HTTPS 로 받아 `X-Relay-Key` 열쇠를 확인하고 몸통을 그대로 알리고에 넘긴다.
비밀(API Key 등)은 여기 저장되지 않는다 — 워커가 보내는 몸통에 실려 지나갈 뿐이다.

---

## A. Oracle Cloud 가입 · VM 하나

1. https://cloud.oracle.com → **Start for free** → 가입. 카드는 본인 확인용(결제 없음). **홈 리전은 South Korea Central (Seoul)** —
   나중에 못 바꾼다.
2. 콘솔 → 왼쪽 메뉴 **Compute → Instances → Create instance**
   - Image: **Canonical Ubuntu 22.04**
   - Shape: **VM.Standard.E2.1.Micro** (Always Free 표시 · AMD). ARM(A1)은 자주 「Out of capacity」라 피한다.
   - Networking: 새 VCN 기본값 그대로 · **Assign a public IPv4 address** 가 켜져 있는지 확인
   - Add SSH keys: **Generate a key pair for me** → **Save private key** (`ssh-key-….key`) 를 내려받아 둔다
   - **Create**. 뜨는 **Public IP address** 를 적어 둔다 → 아래에서 `<IP>`
3. 문 열기(Oracle 쪽 방화벽): 인스턴스 화면 → **Subnet** 링크 → **Default Security List** → **Add Ingress Rules**
   - Source CIDR `0.0.0.0/0` · IP Protocol TCP · Destination Port Range `80` → Add
   - 같은 식으로 `443` 하나 더

## B. 접속해서 Caddy 올리기 (윈도우 PowerShell)

```powershell
ssh -i "C:\내려받은\ssh-key-xxxx.key" ubuntu@<IP>
```
(「UNPROTECTED PRIVATE KEY」가 나오면 그 .key 파일 → 속성 → 보안 → 고급에서 상속 끊고 본인만 남긴 뒤 다시.)

접속되면 아래를 **한 덩이씩** 붙여넣는다.

```bash
# 1) 우분투 안쪽 방화벽 — Oracle 이미지는 iptables 가 80/443 을 막고 있다
sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null 2>&1; sudo netfilter-persistent save

# 2) Caddy 설치
sudo apt update && sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# 3) 설정 — 저장소의 Caddyfile 을 받아 IP 와 열쇠를 채운다. 열쇠는 여기서 새로 만든다
IP=$(curl -4 -s ifconfig.me); KEY=$(openssl rand -hex 24)
curl -s https://raw.githubusercontent.com/khhyun827-lang/hahyunmath/main/worker/relay/Caddyfile \
  | sed "s/RELAY_HOST_HERE/$IP.sslip.io/; s/RELAY_KEY_HERE/$KEY/" | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo systemctl reload caddy; sleep 8

# 4) 확인 — 첫 줄 "no", 둘째 줄 "relay ok" 가 나와야 한다 (인증서를 받느라 첫 번은 몇 초 걸릴 수 있다)
curl -s https://$IP.sslip.io/; echo
curl -s -H "X-Relay-Key: $KEY" https://$IP.sslip.io/; echo

# 5) Cloudflare 에 넣을 값 둘 — 이 두 줄을 그대로 옮긴다
echo "ALIGO_RELAY      = https://$IP.sslip.io"
echo "ALIGO_RELAY_KEY  = $KEY"
```

`https://<IP>.sslip.io` 는 IP 만으로 HTTPS 인증서를 받게 해 주는 공개 서비스다(도메인 없이 됨).
안 되면 `sudo journalctl -u caddy -n 30 --no-pager` 를 보면 까닭이 있다 — 대개 A-3(80/443 문)이나 B-1 을 빠뜨린 것.

## C. 알리고 · Cloudflare

1. **알리고 → 문자 API → 발신 IP** 에 `<IP>` 를 **네 칸 다 채워** 등록한다. 09-21 에 넣은 Cloudflare 대역 14개는 지워도 된다.
2. **Cloudflare → Workers & Pages → hahyunmath-gemini-proxy → Settings → Variables and Secrets** 에 Secret 둘 추가:
   `ALIGO_RELAY` · `ALIGO_RELAY_KEY` (위 5 의 값 그대로). 워커는 `2026-09-21e` 이상이어야 한다(`node tools/worker-check.mjs`).
3. 시험 — 리포트 → 「리포트 이미지로 저장」 → 「학부모께 문자로」 (테스트 학생 · 학부모 번호 = 본인 폰).

## 알아둘 것

- 중계는 알리고 두 주소만 안다 (`/sms/*` → apis.aligo.in · `/kakao/*` → kakaoapi.aligo.in). 열쇠가 없거나 틀리면 403 「no」.
- Oracle 상시무료는 «한 달 내내 CPU 를 거의 안 쓰면» 회수 예고 메일이 올 수 있다(무료 계정 Idle 정책). 이 중계는 하루 몇 건이라 그 대상이 될 수 있다 —
  메일이 오면 그때 결제 계정(Pay As You Go · 무료 한도 안이면 여전히 0원)으로 올리면 된다.
- VM 을 다시 만들면 IP 가 바뀐다 → 알리고 발신 IP · `ALIGO_RELAY` 둘 다 고쳐야 한다.
- 워커에 `ALIGO_RELAY` 가 없으면 예전처럼 직접 부른다(그러면 -101 IP 다). 중계를 지나 -101 이 나면 화면 줄에 「중계 서버의 IP 가 등록돼 있는지」라고 뜬다.
