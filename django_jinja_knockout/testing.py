import re
from selenium.webdriver.common.by import By

from django.contrib.staticfiles.testing import StaticLiveServerTestCase

from .automation import AutomationCommands
from .utils.regex import finditer_with_separators
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


# Generic DOM commands.
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

    def _reverse_url(self, viewname, kwargs=None, query=None):
        url = '{}{}'.format(
            self.live_server_url, reverseq(viewname=viewname, kwargs=kwargs, query=query)
        )
        print('_reverse_url: {}'.format(url))
        return self.selenium.get(url)

    # Get active element, for example currently opened BootstrapDialog.
    def _to_active_element(self):
        # from selenium.webdriver.support.wait import WebDriverWait
        # http://stackoverflow.com/questions/23869119/python-selenium-element-is-no-longer-attached-to-the-dom
        # self.__class__.selenium.implicitly_wait(2)
        return self.selenium.switch_to.active_element

    def _by_id(self, id):
        return self.selenium.find_element_by_id(id)

    def _keys_by_id(self, id, keys):
        input = self.selenium.find_element_by_id(id)
        input.send_keys(keys)
        return input

    def escape_xpath_literal(self, s):
        if "'" not in s:
            return "'{}'".format(s)
        if '"' not in s:
            return '"{}"'.format(s)
        delimeters = re.compile(r'\'')
        tokens = finditer_with_separators(delimeters, s)
        for key, token in enumerate(tokens):
            if token == '\'':
                tokens[key] = '"\'"'
            else:
                tokens[key] = "'{}'".format(token)
        result = "concat({})".format(','.join(tokens))
        return result

    def format_xpath(self, s, *args, **kwargs):
        return s.format(
            *tuple(self.escape_xpath_literal(arg) for arg in args),
            **dict({key: self.escape_xpath_literal(arg) for key, arg in kwargs.items()})
        )

    def _by_xpath(self, xpath):
        return self.selenium.find_element_by_xpath(xpath)

    def _by_classname(self, classname):
        return self.selenium.find_element_by_class_name(classname)

    def _by_css_selector(self, css_selector):
        return self.selenium.find_elements_by_css_selector(css_selector)

    def _element_by_xpath(self, xpath):
        return self.last_result.find_element(By.XPATH, xpath)

    def _ancestor(self, expr):
        return self._element_by_xpath(
            'ancestor::{}'.format(expr)
        )

    def _ancestor_or_self(self, expr):
        return self._element_by_xpath(
            'ancestor-or-self::{}'.format(expr)
        )

    def _click(self):
        return self.last_result.click()

    def _button_click(self, button_title):
        return self.exec(
            'to_active_element',
            'element_by_xpath', (self.format_xpath(
                '//button[contains(., {})]',
                button_title
            ),),
            'click'
        )

    def _find_submit_by_view(self, viewname, kwargs=None, query=None):
        return self.selenium.find_element_by_xpath(
            self.format_xpath(
                '//form[@action={action}]//button[@type="submit"]',
                action=reverseq(viewname=viewname, kwargs=kwargs, query=query)
            )
        )

    def _find_anchor_by_view(self, viewname, kwargs=None, query=None):
        return self.selenium.find_element_by_xpath(
            self.format_xpath(
                '//a[@href={action}]',
                action=reverseq(viewname=viewname, kwargs=kwargs, query=query)
            )
        )


# BootstrapDialog / AJAX grids specific commands.
class DjkSeleniumCommands(SeleniumCommands):

    def _has_messages_success(self):
        return self._by_xpath('//div[@class="messages"]/div[@class="alert alert-danger success"]')

    def _jumbotron_text(self, text):
        return self._by_xpath(
            self.format_xpath(
                '//div[@class="jumbotron"]/div[@class="default-padding" and contains(text(), {})]',
                text
            )
        )

    def _input_as_select_click(self, id):
        return self.exec(
            'by_id', (id,),
            'element_by_xpath', ('parent::label',),
            'click',
        )

    def _fk_widget_click(self, id):
        return self.exec(
            'by_id', (id,),
            'element_by_xpath', ('following-sibling::button',),
            'click',
            'to_active_element',
        )

    def _grid_button_action_click(self, action_name):
        return self.exec(
            'by_classname', ('grid-controls',),
            'element_by_xpath', (self.format_xpath(
                '//span[text()={}]/parent::button', action_name
            ),),
            'click',
        )

    def _dialog_button_click(self, button_title):
        return self.exec(
            'to_active_element',
            'element_by_xpath', (self.format_xpath(
                '//div[@class="bootstrap-dialog-footer"]//button[contains(., {})]',
                button_title
            ),),
            'click'
        )

    def _assert_field_error(self, id, text):
        return self.exec(
            'by_id', (id,),
            'element_by_xpath', (self.format_xpath(
                'parent::div[@class="has-error"]/div[text()={}]', text
            ),),
        )

    def _grid_find_data_column(self, caption, value):
        return self._element_by_xpath(
            self.format_xpath('//td[@data-caption={} and text()={}]', caption, value)
        )

    def _grid_select_current_row(self):
        return self.exec(
            'element_by_xpath', ('ancestor-or-self::tr//td[@data-bind="click: onSelect"]',),
            'click'
        )
