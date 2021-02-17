import inspect
import tempfile
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.chrome.webdriver import WebDriver as ChromeWebDriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service


class WebDriver(ChromeWebDriver):

    is_headless = False
    enable_logging = False
    window_size = False
    # Ubuntu snap path
    chrome_path = '/usr/bin/chromium-browser'
    webdriver_path = '/snap/bin/chromium.chromedriver'

    def __init__(self, *args, **kwargs):

        chrome_options = Options()
        log_file = None
        if self.is_headless:
            # https://stackoverflow.com/questions/22424737/unknown-error-chrome-failed-to-start-exited-abnormally
            # https://stackoverflow.com/questions/50642308/webdriverexception-unknown-error-devtoolsactiveport-file-doesnt-exist-while-t
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--headless')
            self.enable_logging = True
        if self.enable_logging:
            log_file = tempfile.NamedTemporaryFile(mode='w', delete=False, encoding='utf-8')
        if self.window_size:
            chrome_options.add_argument('--window-size={},{}'.format(*self.window_size))
        if self.chrome_path:
            chrome_options.binary_location = self.chrome_path
        kwargs['options'] = chrome_options
        if self.webdriver_path:
            webdriver_args = inspect.signature(ChromeWebDriver.__init__)
            if 'service' in webdriver_args.parameters:
                # Selenium>=4.0
                kwargs['service'] = Service(
                    self.webdriver_path,
                    service_args=['--verbose'],
                    log_path=log_file.name
                )
            else:
                kwargs.update({
                    'executable_path': self.webdriver_path,
                    'service_args': ['--verbose'],
                    'service_log_path': self.log_path
                })
        try:
            super().__init__(*args, **kwargs)
        except WebDriverException:
            if self.enable_logging:
                log_file.seek(0)
                print(log_file.read())
                log_file.close()
            raise
