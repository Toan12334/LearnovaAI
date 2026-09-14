import json
import requests


def search_serper(
    query: str, api_key: str, country: str = "vn", lang: str = "vi"
):
    """Gửi truy vấn tìm kiếm đến Serper.dev API và trả về kết quả JSON."""
    url = "https://google.serper.dev/search"

    payload = json.dumps({
        "q": query,
        "gl": country,  # Mã quốc gia (vn: Việt Nam)
        "hl": lang,  # Ngôn ngữ giao diện tìm kiếm (vi: Tiếng Việt)
    })

    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}

    try:
        response = requests.post(url, headers=headers, data=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Lỗi khi gọi Serper API: {e}")
        return None


# --- VÍ DỤ SỬ DỤNG TRONG DỰ ÁN CHECK ĐẠO VĂN ---
if __name__ == "__main__":
    SERPER_API_KEY = "01adc90d88d96dfd031ce58207d5536b547b42ae"

    # Đặt cụm từ trong dấu ngoặc kép "" để Google tìm kiếm chính xác 100% cụm từ
    search_query = '"Không có kính không phải vì xe không có kính"'

    print(f"Đang tìm kiếm cụm từ: {search_query}\n")
    data = search_serper(query=search_query, api_key=SERPER_API_KEY)

    if data and "organic" in data:
        print(f"Tìm thấy {len(data['organic'])} kết quả trùng khớp:\n")

        for index, item in enumerate(data["organic"], 1):
            title = item.get("title")
            link = item.get("link")
            snippet = item.get("snippet")
            date = item.get(
                "date", "Không xác định"
            )  # Dùng để đối soát ngày xuất bản

            print(f"[{index}] {title}")
            print(f"    - URL: {link}")
            print(f"    - Ngày đăng: {date}")
            print(f"    - Trích dẫn: {snippet}\n")
    else:
        print("Không tìm thấy kết quả hoặc có lỗi xảy ra.")