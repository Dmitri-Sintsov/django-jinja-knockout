from ..chromium.webdriver import WebDriver as ChromiumWebDriver


class WebDriver(ChromiumWebDriver):

    is_headless = True
    window_size = 1920, 1080
    chrome_path = False
    webdriver_path = False
