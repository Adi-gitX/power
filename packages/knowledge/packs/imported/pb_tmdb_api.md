# TMDB API Integration Playbook
NOTE: This playbook and all associated code stubs are provided solely for reference purposes.
## Setup
1. Get API key: https://www.themoviedb.org/settings/api
2. Environment: `TMDB_API_KEY="your_key"` in `.env` file
---
## Core Request Handler with Caching
```python
API_KEY = os.getenv("TMDB_API_KEY")
CACHE_TTL_DEFAULT = 60 * 60        # 1 hour
CACHE_TTL_CONFIG = 24 * 60 * 60    # 24 hours
cache = {}
session = requests.Session()
session.headers.update({"Accept": "application/json"})
def tmdb_request(endpoint, params=None, ttl=CACHE_TTL_DEFAULT):
    params = params or {}
    key = f"{endpoint}_{json.dumps(params, sort_keys=True)}"
    cached = cache.get(key)
    if cached and time.time() - cached["ts"] < ttl:
        return cached["data"]
    url = f"https://api.themoviedb.org/3{endpoint}"
    params = {"api_key": API_KEY, **params}
    params = {k: v for k, v in params.items() if v is not None}
    try:
        res = session.get(url, params=params, timeout=10)
        if res.status_code == 429:
            time.sleep(int(res.headers.get("Retry-After", 2)))
            res = session.get(url, params=params, timeout=10)
        res.raise_for_status()
    except Exception:
        return None
    data = res.json()
    cache[key] = {"data": data, "ts": time.time()}
    return data
```
---
## Configuration (call at startup)
```python
config = tmdb_request("/configuration", ttl=CACHE_TTL_CONFIG)
IMAGE_BASE = config["images"]["secure_base_url"] if config else "https://image.tmdb.org/t/p/"
def get_image_url(path, size="w500"):
    return f"{IMAGE_BASE}{size}{path}" if path else None
# Sizes: w92/w185 (thumbnails), w342 (cards), w500 (detail), w780/w1280 (backdrops)
```
---
## Search & Discovery
```python
# Multi-search (movies, TV, people in one call)
def search_multi(query, page=1):
    return tmdb_request("/search/multi", {"query": query, "page": page})
# Type-specific: /search/movie, /search/tv, /search/person
def search(media_type, query, page=1, year=None):
    return tmdb_request(f"/search/{media_type}", {"query": query, "page": page, "year": year})
# Discovery with filters (sort_by: popularity.desc|vote_average.desc|release_date.desc)
def discover(media_type, filters, page=1):
    return tmdb_request(f"/discover/{media_type}", {
        "page": page,
        "sort_by": filters.get("sort_by"),
        "with_genres": filters.get("genre_ids"),  # comma-separated IDs, not names
        "year": filters.get("year"),
        "vote_average.gte": filters.get("min_rating")
    })
# Trending (media_type: all|movie|tv|person, time_window: day|week)
def get_trending(media_type="all", time_window="week"):
    return tmdb_request(f"/trending/{media_type}/{time_window}")
```
---
## Detail Endpoints (append_to_response = fewer API calls)
```python
def get_movie_details(movie_id):
    return tmdb_request(f"/movie/{movie_id}", {
        "append_to_response": "credits,videos,images,keywords,reviews,similar,recommendations,release_dates"
    })
def get_tv_details(tv_id):
    return tmdb_request(f"/tv/{tv_id}", {
        "append_to_response": "credits,videos,images,keywords,reviews,similar,content_ratings"
    })
def get_person_details(person_id):
    return tmdb_request(f"/person/{person_id}", {
        "append_to_response": "movie_credits,tv_credits,combined_credits,images"
    })
# Lazy load these only when needed
def get_tv_season(tv_id, season_num):
    return tmdb_request(f"/tv/{tv_id}/season/{season_num}")
def get_collection(collection_id):  # only if movie.belongs_to_collection exists
    return tmdb_request(f"/collection/{collection_id}")
```
---
## Curated Lists
```python
def get_list(endpoint, page=1):
    return tmdb_request(endpoint, {"page": page})
# Movies: /movie/upcoming, /movie/now_playing, /movie/popular, /movie/top_rated
# TV: /tv/airing_today, /tv/on_the_air, /tv/popular, /tv/top_rated
def get_genres(media_type):  # media_type: movie|tv
    data = tmdb_request(f"/genre/{media_type}/list")
    return data.get("genres", []) if data else []
```
---
## Schema Normalization (Movie vs TV)
```python
def get_title(item):
    return item.get("title") or item.get("name")
def get_release_date(item):
    return item.get("release_date") or item.get("first_air_date")
def get_release_year(item):
    date = get_release_date(item)
    return int(date[:4]) if date else None
def get_keywords(item):
    keywords = item.get("keywords", {})
    return keywords.get("keywords") or keywords.get("results") or []
def get_cast(item):
    return item.get("credits", {}).get("cast", [])
def get_crew(item):
    return item.get("credits", {}).get("crew", [])
```
---
## Videos & Trailers
```python
def get_trailer(videos):
    results = videos.get("results", []) if videos else []
    if not results:
        return None    
    # Priority: official trailer > any trailer > teaser
    for v in results:
        if v.get("type") == "Trailer" and v.get("site") == "YouTube" and v.get("official"):
            return v
    for v in results:
        if v.get("type") == "Trailer" and v.get("site") == "YouTube":
            return v
    for v in results:
        if v.get("type") == "Teaser" and v.get("site") == "YouTube":
            return v
    return None
def get_trailer_url(videos):
    trailer = get_trailer(videos)
    return f"https://www.youtube.com/embed/{trailer['key']}?autoplay=1" if trailer else None
```
---
## Ratings & Certifications
```python
def get_tv_rating_by_country(content_ratings, country="US"):
    for r in content_ratings.get("results", []):
        if r.get("iso_3166_1") == country:
            return r.get("rating")
    return None
def get_movie_certification(release_dates, country="US"):
    for r in release_dates.get("results", []):
        if r.get("iso_3166_1") == country:
            for rd in r.get("release_dates", []):
                if rd.get("certification"):
                    return rd["certification"]
    return None
```
---
## Critical Tips
1. Configuration first - Call `/configuration` at startup, cache 24h
2. Image sizes - Try to use `w185` for cards, `w342` for detail, insted of `original` for thumbnails.
3. Collections - Check `belongs_to_collection` before fetching
4. Season numbering - Seasons start at 1 (Season 0 = specials)
5. Throttle search - Debounce user input
6. Max pagination - TMDB enforces max 500 pages
7. FastAPI routing - Declare fixed paths (`/movie/now_playing`) before parameterized (`/movie/{id}`)
8. Async - Use `httpx` instead of `requests` for async FastAPI routes
