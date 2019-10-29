from ..chromium.webdriver import WebDriver as ChromiumWebDriver


class WebDriver(ChromiumWebDriver):

    is_headless = True
    window_size = 1920, 1080
