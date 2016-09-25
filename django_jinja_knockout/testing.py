from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.utils.html import format_html

from .automation import AutomationCommands
from .tpl import reverseq


"""
Selenium tests may require Firefox ESR because Ubuntu sometimes updates Firefox to newer version
than currently installed Selenium supports.

Here is the example of installing Firefox ESR in Ubuntu 14.04:

apt-get remove firefox
wget http://ftp.mozilla.org/pub/firefox/releases/45.4.0esr/linux-x86_64/en-US/firefox-45.4.0esr.tar.bz2
tar -xvjf firefox-45.4.0esr.tar.bz2 -C /opt
ln -s /opt/firefox/firefox /usr/bin/firefox

Do not forget to update to latest ESR when running the tests.
"""


class SeleniumCommands(AutomationCommands, StaticLiveServerTestCase):

    WAIT_SECONDS = 10

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.selenium = cls.selenium_factory()
        cls.selenium.implicitly_wait(cls.WAIT_SECONDS)

    @classmethod
    def tearDownClass(cls):
        # cls.selenium.quit()
        super().tearDownClass()

    def do_reverse_url(self, viewname, kwargs=None, query=None):
        url = '{}{}'.format(
            self.live_server_url, reverseq(viewname=viewname, kwargs=kwargs, query=query)
        )
        print('do_reverse_url: {}'.format(url))
        return self.selenium.get(url)

    def do_keys_by_id(self, id, keys):
        input = self.selenium.find_element_by_id(id)
        input.send_keys(keys)
        return input

    def do_by_xpath(self, xpath):
        return self.selenium.find_element_by_xpath(xpath)

    def do_click(self):
        return self.last_result.click()

    def do_find_submit_by_viewname(self, viewname, kwargs=None, query=None):
        return self.selenium.find_element_by_xpath(
            format_html(
                '//form[@action="{action}"]//button[@type="submit"]',
                action=reverseq(viewname=viewname, kwargs=kwargs, query=query)
            )
        )
