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
    chrome_path = '/snap/bin/chromium'
    webdriver_path = '/snap/bin/chromium.chromedriver'

    def _get_init_options(self):
        chrome_options = Options()
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        # https://stackoverflow.com/a/58748188
        chrome_options.add_argument('--remote-debugging-port=9222')
        if self.is_headless:
            # https://stackoverflow.com/questions/22424737/unknown-error-chrome-failed-to-start-exited-abnormally
            # https://stackoverflow.com/questions/50642308/webdriverexception-unknown-error-devtoolsactiveport-file-doesnt-exist-while-t
            # https://github.com/jsoma/selenium-github-actions/blob/main/scraper.py
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--disable-gpu')
            self.enable_logging = True
        if self.window_size:
            chrome_options.add_argument('--window-size={},{}'.format(*self.window_size))
        if self.chrome_path:
            chrome_options.binary_location = self.chrome_path
        return chrome_options

    # Selenium >=4.0
    def _get_service(self, service_kwargs=None):
        _service_kwargs = {
            'executable_path': self.webdriver_path if self.webdriver_path else 'chromedriver'
        }
        if self.is_headless:
            _service_kwargs['service_args'] = ['--verbose']
        if self.log_file:
            _service_kwargs['log_path'] = self.log_file.name
        _service_kwargs.update(service_kwargs)
        return Service(**service_kwargs)

    def _get_legacy_kwargs(self):
        kwargs = {}
        if self.webdriver_path:
            kwargs['executable_path'] = self.webdriver_path
        if self.is_headless:
            kwargs['service_args'] = ['--verbose']
        if self.log_file:
            kwargs['service_log_path'] = self.log_file.name
        return kwargs

    def __init__(self, *args, **kwargs):
        kwargs['options'] = self._get_init_options()
        self.log_file = None
        if self.enable_logging:
            self.log_file = tempfile.NamedTemporaryFile(mode='r+', delete=False, encoding='utf-8')
        webdriver_args = inspect.signature(ChromeWebDriver.__init__)
        if 'service' in webdriver_args.parameters:
            # Selenium>=4.0
            service_kwargs = kwargs.pop('service_kwargs', {})
            kwargs['service'] = self._get_service(service_kwargs)
        else:
            kwargs.update(
                self._get_legacy_kwargs()
            )
        try:
            super().__init__(*args, **kwargs)
        except WebDriverException:
            if self.enable_logging:
                self.log_file.seek(0)
                print(f'Begin of Selenium log file {self.log_file.name}')
                print(self.log_file.read())
                print(f'End of Selenium log file {self.log_file.name}')
                self.log_file.close()
            raise
