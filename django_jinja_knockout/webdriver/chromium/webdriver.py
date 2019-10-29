from selenium.webdriver.chrome.webdriver import WebDriver as ChromeWebDriver
from selenium.webdriver.chrome.options import Options


class WebDriver(ChromeWebDriver):

    is_headless = False
    window_size = False
    chrome_path = '/usr/lib/chromium-browser/chromium-browser'

    def __init__(self, *args, **kwargs):

        chrome_options = Options()

        if self.is_headless:
            chrome_options.add_argument('--headless')
        if self.window_size:
            chrome_options.add_argument('--window-size={},{}'.format(*self.window_size))
        if self.chrome_path:
            chrome_options.binary_location = self.chrome_path

        kwargs['options'] = chrome_options
        super().__init__(*args, **kwargs)
