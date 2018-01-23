from selenium.webdriver.chrome.webdriver import WebDriver as ChromeWebDriver
from selenium.webdriver.chrome.options import Options


class WebDriver(ChromeWebDriver):

    window_size = 1920, 1080

    def __init__(self, *args, **kwargs):

        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--window-size={},{}'.format(*self.window_size))

        kwargs['chrome_options'] = chrome_options
        return super().__init__(*args, **kwargs)
