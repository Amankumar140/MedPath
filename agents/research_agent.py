import os
import asyncio
import googlemaps
from tavily import TavilyClient
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from schemas import ScrapedHospitalData
from config import GOOGLE_MAPS_KEY

class ResearchAgent:
    def __init__(self):
        self.tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        # Initialize official Google Maps API Client platform
        self.gmaps = googlemaps.Client(key=GOOGLE_MAPS_KEY)

    def resolve_real_distance(self, origin_address: str, hospital_name: str) -> dict:
        """
        Uses Google Distance Matrix and Geocoding APIs to calculate actual road travel distance,
        duration, and hospital coordinates relative to the user location.
        """
        result_payload = {
            "distance_text": "Distance tracking unavailable",
            "lat": None,
            "lng": None
        }
        try:
            # Geocode hospital to extract precise coordinates
            geocode_result = self.gmaps.geocode(f"{hospital_name}, {origin_address}")
            if geocode_result:
                loc = geocode_result[0]['geometry']['location']
                result_payload["lat"] = loc.get("lat")
                result_payload["lng"] = loc.get("lng")
            
            # Fetch real distance matrix metrics
            matrix = self.gmaps.distance_matrix(
                origins=origin_address,
                destinations=f"{hospital_name}, {origin_address}",
                mode="driving"
            )
            if matrix and matrix.get('rows') and matrix['rows'][0]['elements'][0]['status'] == 'OK':
                element = matrix['rows'][0]['elements'][0]
                distance_text = element['distance']['text']
                duration_text = element['duration']['text']
                result_payload["distance_text"] = f"{distance_text} ({duration_text} drive)"
        except Exception as e:
            print(f"⚠️ Distance resolution error: {e}")
        return result_payload

    def run_tavily_search(self, query: str) -> list[ScrapedHospitalData]:
        results = []
        response = self.tavily_client.search(query=query, max_results=3)
        for res in response.get("results", []):
            results.append(ScrapedHospitalData(
                name=res.get("title", "Unknown Site"),
                source="Tavily Search Engine",
                raw_text=res.get("content", ""),
                url=res.get("url", "")
            ))
        return results

    async def scrape_with_playwright(self, url: str) -> ScrapedHospitalData:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(url, timeout=30000)
                await page.wait_for_timeout(2000)
                content = await page.content()
                soup = BeautifulSoup(content, "html.parser")
                for element in soup(["script", "style", "header", "footer", "nav"]):
                    element.extract()
                return ScrapedHospitalData(
                    name=await page.title(),
                    source="Playwright Scraper",
                    raw_text=soup.get_text(separator=" ", strip=True)[:1500],
                    url=url
                )
            except Exception as e:
                return ScrapedHospitalData(name="Error Page", source="Playwright", raw_text=str(e), url=url)
            finally:
                await browser.close()

    def scrape_with_selenium(self, target_search: str) -> list[ScrapedHospitalData]:
        options = Options()
        options.add_argument("--headless=new") # Run without a UI GUI
        options.add_argument("--no-sandbox")   # Required to run as root in Docker
        options.add_argument("--disable-dev-shm-usage") # Overcomes limited resource problems
        
        # Point directly to the Linux container's binary installations
        options.binary_location = "/usr/bin/chromium"
        
        driver = webdriver.Chrome(options=options)
        results = []
        try:
            search_url = f"https://www.google.com/search?q={target_search.replace(' ', '+')}+hospitals"
            driver.get(search_url)
            soup = BeautifulSoup(driver.page_source, "html.parser")
            text_snippet = soup.get_text(separator=" ", strip=True)[:1200]
            results.append(ScrapedHospitalData(
                name=f"Search Reference: {target_search}",
                source="Selenium Web-Driver Engine",
                raw_text=text_snippet,
                url=search_url
            ))
        except Exception as e:
            results.append(ScrapedHospitalData(name="Selenium Error Trace", source="Selenium", raw_text=str(e)))
        finally:
            driver.quit()
        return results

    async def gather_all_data(self, query: str, location: str) -> list[ScrapedHospitalData]:
        """Orchestrates structural aggregations across engines."""
        combined_data = []
        search_query = f"Best hospital clinical departments for {query} in {location}"
        
        # 1. Gather via Fast API
        combined_data.extend(self.run_tavily_search(search_query))
        
        # 2. Gather via Selenium Automation
        combined_data.extend(self.scrape_with_selenium(f"{query} {location}"))
        
        # 3. Dynamic target parsing loop execution via Playwright framework
        if combined_data and combined_data[0].url:
            try:
                target_url = combined_data[0].url
                # FIXED: Await the coroutine natively inside the existing event loop
                playwright_result = await self.scrape_with_playwright(target_url)
                combined_data.append(playwright_result)
            except Exception:
                pass # Graceful degradation during nested event loop calls
                
        return combined_data