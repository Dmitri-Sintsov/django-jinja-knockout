import re
import os
from selenium.webdriver.common.by import By
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.remote.webelement import WebElement

from django.conf import settings
from django.utils import timezone
from django.contrib.staticfiles.testing import StaticLiveServerTestCase

from .automation import AutomationCommands
from .utils.regex import finditer_with_separators
from .utils.sdv import str_to_numeric
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

    WAIT_SECONDS = 20

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logged_error = False

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.selenium = cls.selenium_factory()
        cls.selenium.implicitly_wait(cls.WAIT_SECONDS)

    @classmethod
    def tearDownClass(cls):
        # cls.selenium.quit()
        super().tearDownClass()

    def exec(self, *args):
        try:
            return super().exec(*args)
        except WebDriverException as e:
            if self.logged_error is False and isinstance(self.last_result, WebElement):
                now_str = timezone.now().strftime('%Y-%m-%d_%H-%M-%S')
                scr = self.selenium.get_screenshot_as_png()
                scr_filename = 'selenium_error_screen_{}.png'.format(now_str)
                with open(os.path.join(settings.BASE_DIR, 'logs', scr_filename), 'wb') as f:
                    f.write(scr)
                    f.close()
                log_filename = 'selenium_error_html_{}.htm'.format(now_str)
                with open(os.path.join(settings.BASE_DIR, 'logs', log_filename), encoding='utf-8', mode='w') as f:
                    f.write(self.get_outer_html())
                    f.close()
                log_filename = 'selenium_error_log_{}.txt'.format(now_str)
                with open(os.path.join(settings.BASE_DIR, 'logs', log_filename), encoding='utf-8', mode='w') as f:
                    print(
                        'Error description:{}\n\nError element rect:\n\n{}'.format(
                            str(e), repr(self.last_result.rect)),
                        file=f
                    )
                self.logged_error = True
            raise e

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
        # self.__class__.selenium.implicitly_wait(3)
        # return self.selenium.switch_to_active_element()
        return self.selenium.switch_to.active_element

    def _by_id(self, id):
        return self.selenium.find_element_by_id(id)

    def _keys_by_id(self, id, keys):
        input = self.selenium.find_element_by_id(id)
        input.send_keys(keys)
        return input

    def get_attr(self, attr):
        return self.last_result.get_attribute(attr)

    def get_outer_html(self):
        return self.get_attr('outerHTML')

    def relative_is_displayed(self):
        return self.last_result.is_displayed()

    def relative_is_enabled(self):
        return self.last_result.is_enabled()

    def parse_css_styles(self, element=None, style_str=None):
        if element is not None:
            style_str = element.get_attribute('style')
        styles = {}
        for style_def in style_str.split(';'):
            style_def = style_def.strip()
            if style_def != '':
                parts = list(part.strip() for part in style_def.split(':'))
                val = None
                if len(parts) > 1:
                    val = str_to_numeric(parts[1])
                styles[parts[0]] = val
        return styles


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

    def _relative_by_xpath(self, xpath, *args, **kwargs):
        xpath = self.format_xpath(xpath, *args, **kwargs)
        if xpath.startswith('//'):
            print('_relative_by_xpath is meaningless with absolute xpath queries: {}'.format(xpath))
        return self.last_result.find_element(
            By.XPATH, xpath
        )

    def _ancestor(self, expr):
        return self._relative_by_xpath(
            'ancestor::{}'.format(expr)
        )

    def _ancestor_or_self(self, expr):
        return self._relative_by_xpath(
            'ancestor-or-self::{}'.format(expr)
        )

    def _click(self):
        return self.last_result.click()

    def _button_click(self, button_title):
        return self.exec(
            'to_active_element',
            'relative_by_xpath', ('.//button[contains(., {})]', button_title,),
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
            'relative_by_xpath', ('parent::label',),
            'click',
        )

    def _to_top_bootstrap_dialog(self):
        dialogs = self.selenium.find_elements_by_css_selector('.bootstrap-dialog')
        top_key = None
        styles_list = []
        for key, dialog in enumerate(dialogs):
            if dialog.is_displayed():
                styles = self.parse_css_styles(dialog)
                styles_list.append(styles)
                if top_key is None:
                    top_key = key
                else:
                    if styles.get('z-index') > styles_list[top_key].get('z-index'):
                        top_key = key
        if top_key is None:
            raise ValueError('Cannot find top bootstrap dialog')
        else:
            return dialogs[top_key]

    def _fk_widget_click(self, id):
        return self.exec(
            'by_id', (id,),
            'relative_by_xpath', ('following-sibling::button',),
            'click',
            'to_top_bootstrap_dialog',
            # 'to_active_element',
        )

    def _grid_button_action_click(self, action_name):
        return self.exec(
            'relative_by_xpath', (
                './/div[contains(concat(" ", @class, " "), " grid-controls ")]'
                '//span[text()={}]/parent::button',
                action_name,
            ),
            'click',
        )

    def _dialog_button_click(self, button_title):
        return self.exec(
            # 'to_active_element',
            'to_top_bootstrap_dialog',
            'relative_by_xpath', (
                './/div[@class="bootstrap-dialog-footer"]//button[contains(., {})]',
                button_title,
            ),
            'click',
        )

    def _assert_field_error(self, id, text):
        return self.exec(
            'by_id', (id,),
            'relative_by_xpath', (
                'parent::div[@class="has-error"]/div[text()={}]', text
            ),
        )

    def _grid_find_data_column(self, caption, value):
        return self._relative_by_xpath(
            './/td[@data-caption={} and text()={}]', caption, value
        )

    def _grid_select_current_row(self):
        return self.exec(
            'relative_by_xpath', ('ancestor-or-self::tr//td[@data-bind="click: onSelect"]',),
            'click'
        )
