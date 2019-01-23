import glob
import re
import os
import sys
import time
from collections import namedtuple
from importlib import import_module
from urllib.parse import urlparse, urlunparse

from selenium.common.exceptions import WebDriverException
from selenium.webdriver.remote.webelement import WebElement
# from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from django.conf import settings
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.test.utils import override_settings
from django.utils import timezone
from django.core.management import call_command
# from django.middleware.csrf import get_token

from .automation import AutomationCommands
from .testing_components import FormCommands, ComponentCommands, DialogCommands, GridCommands
from .utils.regex import finditer_with_separators
from .utils.sdv import str_to_numeric, reverse_enumerate
from .tpl import reverseq, escape_css_selector


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


# Selenium commands with errors logging and automation commands support.
class BaseSeleniumCommands(AutomationCommands):

    DEFAULT_SLEEP_TIME = 3
    SAVE_COMMANDS_HTML = 0
    sync_commands_list = []

    def __init__(self, *args, **kwargs):
        self.testcase = kwargs.pop('testcase')
        self.selenium = self.testcase.selenium
        super().__init__(*args, **kwargs)
        self.logged_error = False
        self.command_index = 0
        self.history = []
        self.last_sync_command_key = -1
        # self.sleep_between_commands = 1.2
        self.sleep_between_commands = 0

    def _sleep(self, secs):
        time.sleep(secs)
        return self.context

    def _default_sleep(self):
        return self._sleep(self.DEFAULT_SLEEP_TIME)

    def _wait(self, secs):
        self.selenium.implicitly_wait(secs)
        return self.context

    def _default_wait(self):
        return self._wait(self.DEFAULT_SLEEP_TIME)

    # https://code.djangoproject.com/wiki/Fixtures
    def _dump_data(self, prefix=''):
        self._default_wait()
        self._default_sleep()
        call_command(
            'dumpdata',
            indent=4,
            exclude=[
                'auth.permission',
                'contenttypes',
                'sessions',
            ],
            format='json',
            use_natural_foreign_keys=True,
            use_natural_primary_keys=True,
            output=os.path.join(
                settings.FIXTURE_DIRS[0],
                '{:04d}_{}.json'.format(
                    self.testcase.fixtures_order.index(prefix),
                    prefix
                )
            )
        )
        return self.context

    def log_command(self, operation, args, kwargs):
        op_args = [operation]
        op_format = 'Operation: {}'
        if len(args) > 0:
            op_args.append(repr(args))
            op_format += ' \\ args: {}'
        if len(kwargs) > 0:
            op_args.append(repr(kwargs))
            op_format += ' \\ kwargs: {}'
        op_str = op_format.format(*op_args)
        print(op_str, end='')
        print(' \\ Nesting level: current = {}, previous = {}'.format(
            self.nesting_level, self.prev_nesting_level
        ))

        if self.SAVE_COMMANDS_HTML > 0:
            # Remove previous command log files, if any.
            if self.command_index == 0:
                for cmd_file in glob.glob(os.path.join(settings.BASE_DIR, 'logs', 'command_*.html')):
                    os.remove(cmd_file)
            html_filename = os.path.join(
                settings.BASE_DIR,
                'logs',
                'command_{:04d}_{}.html'.format(self.command_index, op_args[0])
            )
            with open(html_filename, "w") as cmd_file:
                parse_result = list(urlparse(self.selenium.current_url))
                if parse_result[1] != '':
                    # Remove arbitrary network port, used by Selenium driver from the logged url.
                    parse_result[1] = 'localhost'
                cmd_file.write('<!-- {} -->\n<!-- {} -->\n'.format(op_str, urlunparse(parse_result)))
                stripped_source = self.selenium.page_source
                if self.SAVE_COMMANDS_HTML > 1:
                    # Todo: Is it possible to get csrf token to optionally remove it from the page source (better diffs)?
                    # csrf_token = get_token()
                    for sub in [
                        (
                            r'"csrfToken": "([\dA-Za-z]+)"',
                            '"csrfToken": ""'
                        ),
                        (
                            r'name="csrfmiddlewaretoken" value="([\dA-Za-z]+)"',
                            'name="csrfmiddlewaretoken" value=""'
                        ),
                    ]:
                        stripped_source = re.sub(*sub, stripped_source)
                    if self.SAVE_COMMANDS_HTML > 2:
                        stripped_source = '\n'.join(
                            [line.strip() for line in stripped_source.splitlines() if line.strip() != '']
                        )
                cmd_file.write(stripped_source)

    def exec_command(self, operation, *args, **kwargs):
        try:
            self.history.append([operation, args, kwargs])
            self.log_command(operation, args, kwargs)
            result, exec_time = super().exec_command(operation, *args, **kwargs)
            # Do not execute extra sleep when returning from upper level of recursion,
            # otherwise extra sleep would incorrectly accumulate.
            if self.nesting_level >= self.prev_nesting_level:
                unsleep_time = self.sleep_between_commands - exec_time
                if unsleep_time > 0:
                    self._sleep(unsleep_time)
                    print('Unsleep time: {}'.format(unsleep_time))
            self.command_index += 1
            return result, exec_time
        except WebDriverException as e:
            batch_exec_time = e.exec_time
            # Try to redo last commands that were out of sync, if there is any.
            # That should prevent slow clients from not finding DOM elements after opening / closing BootstrapDialog
            # and / or anchor clicking while current page is just loaded.
            sync_command_key = None
            for key, command in reverse_enumerate(self.history):
                if key == self.last_sync_command_key:
                    break
                if command[0] in self.__class__.sync_commands_list:
                    sync_command_key = key
                    break
            if sync_command_key is not None:
                self.last_sync_command_key = sync_command_key
                # Do not store self.context.
                # Wait until slow browser DOM updates.
                self._default_wait()
                if self.sleep_between_commands > 0:
                    batch_exec_time += self.DEFAULT_SLEEP_TIME
                # Redo last commands from the last global command.
                for command in self.history[sync_command_key:]:
                    try:
                        print('Retrying: ')
                        self.log_command(*command)
                        self.context, exec_time = super().exec_command(command[0], *command[1], **command[2])
                        batch_exec_time += exec_time
                    except WebDriverException as e:
                        self.log_error(e)
                        raise e
                self.command_index += 1
                return self.context, batch_exec_time
            self.log_error(e)
            raise e

    def upload_screenshot(self, scr, scr_filename):
        with open(os.path.join(settings.BASE_DIR, 'logs', scr_filename), 'wb') as f:
            f.write(scr)
            f.close()

    def get_now_str(self):
        return timezone.now().strftime('%Y-%m-%d_%H-%M-%S')

    def log_error(self, ex):
        if self.logged_error is False and isinstance(self.context.element, WebElement):
            now_str = self.get_now_str()
            scr = self.selenium.get_screenshot_as_png()
            scr_filename = 'selenium_error_screen_{}.png'.format(now_str)
            self.upload_screenshot(scr, scr_filename)
            log_filename = 'selenium_error_html_{}.htm'.format(now_str)
            try:
                outer_html = self.get_outer_html()
            except WebDriverException as e:
                outer_html = str(e)
            with open(os.path.join(settings.BASE_DIR, 'logs', log_filename), encoding='utf-8', mode='w') as f:
                f.write(outer_html)
                f.close()
            try:
                browser_log = self.selenium.get_log('browser')
            except WebDriverException as e:
                browser_log = str(e)
            try:
                element_rect = repr(self.context.element.rect)
            except WebDriverException as e:
                element_rect = str(e)
            log_filename = 'selenium_error_log_{}.txt'.format(now_str)
            log = 'Error description:{}\n\nBrowser log:{}\n\nError element rect:\n\n{}'.format(
                str(ex),
                browser_log,
                element_rect)
            print(log, file=sys.stderr)
            with open(os.path.join(settings.BASE_DIR, 'logs', log_filename), encoding='utf-8', mode='w') as f:
                print(log, file=f)
            self.logged_error = True

    def get_attr(self, attr):
        return self.context.element.get_attribute(attr)

    def get_outer_html(self):
        return self.get_attr('outerHTML')

    def relative_is_displayed(self):
        return self.context.element.is_displayed()

    def relative_is_enabled(self):
        return self.context.element.is_enabled()

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

    def parse_css_classes(self, element=None):
        classes_str = element.get_attribute('class')
        return classes_str.split()

    def escape_css_selector(self, s):
        return escape_css_selector(s)

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
        if len(args) == 0 and len(kwargs) == 0:
            return s
        return s.format(
            *tuple(self.escape_xpath_literal(arg) for arg in args),
            **dict({key: self.escape_xpath_literal(arg) for key, arg in kwargs.items()})
        )

    def relative_by_xpath(self, element, xpath, *args, **kwargs):
        xpath = self.format_xpath(xpath, *args, **kwargs)
        if xpath.startswith('//'):
            print('_relative_by_xpath is meaningless with absolute xpath queries: {}'.format(xpath))
        return element.find_element(
            By.XPATH, xpath
        )


# Generic DOM commands.
class SeleniumQueryCommands(BaseSeleniumCommands):

    def _screenshot(self, prefix):
        now_str = self.get_now_str()
        scr = self.selenium.get_screenshot_as_png()
        scr_filename = 'selenium_{}_{}.png'.format(prefix, now_str)
        self.upload_screenshot(scr, scr_filename)
        return self.context

    def _maximize_window(self):
        window_size = None
        try:
            self.selenium.maximize_window()
        except WebDriverException:
            # See https://github.com/mozilla/geckodriver/issues/820
            # Last resort.
            window_size = 1920, 1080
        # Should prevent "Element is not clickable at point" error in phantomjs driver due to small window size.
        if self.testcase.webdriver_name == 'selenium.webdriver.phantomjs.webdriver':
            window_size = 1920, 1080
        if window_size is not None:
            self.selenium.set_window_size(*window_size)
        return self.context

    def _switch_to_last_window(self):
        self.selenium.switch_to.window(self.selenium.window_handles[-1])
        return self._maximize_window()

    def _switch_to_window(self, title):
        self.selenium.switch_to.window(title)
        return self.context

    def _close_current_window(self):
        # default_handle = self.selenium.current_window_handle
        self.selenium.close()
        return self._switch_to_last_window()

    def _relative_url(self, rel_url):
        self.context.http_get_result = self.selenium.get('{}{}'.format(self.testcase.live_server_url, rel_url))
        return self.context

    def _reverse_url(self, viewname, kwargs=None, query=None):
        url = '{}{}'.format(
            self.testcase.live_server_url, reverseq(viewname=viewname, kwargs=kwargs, query=query)
        )
        # print('_reverse_url: {}'.format(url))
        self.context.http_get_result = self.selenium.get(url)
        return self.context

    # Get active element, for example currently opened BootstrapDialog.
    # Randomly fails with dialogs thus is not used.
    def _to_active_element(self):
        # from selenium.webdriver.support.wait import WebDriverWait
        # http://stackoverflow.com/questions/23869119/python-selenium-element-is-no-longer-attached-to-the-dom
        # self.__class__.selenium.implicitly_wait(3)
        # return self.selenium.switch_to_active_element()
        self.context.element = self.selenium.switch_to.active_element
        return self.context

    def _by_wait(self, by, key):
        try:
            self.context.element = WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until(
                EC.element_to_be_clickable((by, key))
            )
        except WebDriverException:
            self.context.element = WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until(
                EC.presence_of_element_located((by, key))
            )
        return self.context

    def _by_id(self, id):
        try:
            self.context.element = self.selenium.find_element_by_id(id)
            return self.context
        except WebDriverException:
            return self._by_wait(By.ID, id)

    def _by_link_text(self, link_text):
        try:
            self.context.element = self.selenium.find_element_by_link_text(link_text)
            return self.context
        except WebDriverException:
            return self._by_wait(By.LINK_TEXT, link_text)

    def _keys(self, *keys_list):
        for keys in keys_list:
            self.context.element.send_keys(keys)
        return self.context

    def _all_keys(self, *keys_list):
        # Clear is replaced to "Select All" / "Delete" because it has bugs in IE webdriver.
        # self.context.element.clear()
        self.context.element.send_keys(Keys.CONTROL, 'a')
        self.context.element.send_keys(Keys.DELETE)
        return self._keys(*keys_list)

    def _keys_by_id(self, id, *keys_list):
        self.context = self._by_id(id)
        return self._all_keys(*keys_list)

    def _by_xpath(self, xpath):
        try:
            self.context.element = self.selenium.find_element_by_xpath(xpath)
            return self.context
        except WebDriverException:
            return self._by_wait(By.XPATH, xpath)

    def _by_classname(self, classname):
        try:
            self.context.element = self.selenium.find_element_by_class_name(classname)
            return self.context
        except WebDriverException:
            return self._by_wait(By.CLASS_NAME, classname)

    def _by_css_selector(self, css_selector):
        # Commented out, will not work for multiple elements (no iteration).
        # return self._by_wait(By.CSS_SELECTOR, css_selector)
        self.context.element = self.selenium.find_elements_by_css_selector(css_selector)
        return self.context

    def _relative_by_xpath(self, xpath, *args, **kwargs):
        self.context.element = self.relative_by_xpath(self.context.element, xpath, *args, **kwargs)
        return self.context

    def _scroll_to_element(self):
        # if self.testcase.webdriver_name == 'selenium.webdriver.firefox.webdriver':
        self.selenium.execute_script(
            'window.scrollTo(' +
            str(self.context.element.location['x']) + ', ' + str(self.context.element.location['y']) +
            ')'
        )
        return self.context

    def _click(self):
        # A workaround for "Element is not clickable at point" error.
        # http://stackoverflow.com/questions/11908249/debugging-element-is-not-clickable-at-point-error
        # https://github.com/seleniumhq/selenium-google-code-issue-archive/issues/2766
        # https://github.com/SeleniumHQ/selenium/issues/1867
        # https://github.com/SeleniumHQ/selenium/issues/2077
        # https://jkotests.wordpress.com/2015/03/20/element-is-not-clickable-due-to-another-element-that-would-receive-the-click/
        # http://learn-automation.com/how-to-solve-element-is-not-clickable-at-pointxy-in-selenium/

        self._scroll_to_element()

        # ActionChains(self.selenium).move_to_element(self.context.element)
        # http://stackoverflow.com/questions/29377730/executing-a-script-in-selenium-python
        # http://stackoverflow.com/questions/34562061/webdriver-click-vs-javascript-click
        """
        self.selenium.execute_script(
            'arguments[0].click();', self.context.element
        )
        """
        self.context.element.click()

        return self.context

    def _button_click(self, button_title):
        self.context = self._by_xpath(
            self.format_xpath('//button[contains(., {})]', button_title)
        )
        return self._click()

    def _find_anchor_by_view(self, viewname, kwargs=None, query=None):
        return self._by_xpath(
            self.format_xpath(
                '//a[@href={action}]',
                action=reverseq(viewname=viewname, kwargs=kwargs, query=query)
            )
        )

    def _click_anchor_by_view(self, viewname, kwargs=None, query=None):
        return self.exec(
            'find_anchor_by_view', (viewname, kwargs, query),
            'click',
        )

    def _click_by_link_text(self, link_text):
        return self.exec(
            'by_link_text', (link_text,),
            'click',
        )

    def _relative_button_click(self, button_title):
        self.context = self._relative_by_xpath(
            './/button[contains(., {})]', button_title
        )
        return self._click()


# BootstrapDialog / AJAX grids specific commands.
class DjkSeleniumCommands(SeleniumQueryCommands, GridCommands, DialogCommands, ComponentCommands, FormCommands):

    sync_commands_list = [
        'click',
        'click_anchor_by_view',
        'to_top_bootstrap_dialog',
    ]

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

    def _assert_field_error(self, id, text):
        return self.exec(
            'by_id', (id,),
            'relative_by_xpath', (
                'parent::div[@class="has-error"]/div[text()={}]', text
            ),
        )

    def _fk_widget_click(self, id):
        return self.exec(
            'by_id', (id,),
            'relative_by_xpath', ('following-sibling::button',),
            'click',
            'to_top_bootstrap_dialog',
            'dialog_is_component',
            # 'to_active_element',
        )

    def _fk_widget_add_and_select(self, fk_id, add_commands, select_commands):
        commands = \
            (
                'fk_widget_click', (fk_id,),
                'grid_button_action', ('Add',),
            ) + add_commands + \
            (
                'dialog_footer_button_click', ('Save',),
                'to_top_bootstrap_dialog',
                'dialog_is_component',
            ) + select_commands + \
            (
                'grid_select_current_row',
                'dialog_footer_button_click', ('Apply',),
            )
        return self.exec(*commands)


OsFixture = namedtuple('OsFixture', 'level, prefix, mtime, is_loaded')


@override_settings(DEBUG=True)
class DjkTestCase(StaticLiveServerTestCase):

    fixtures = []
    fixtures_order = []
    # Will work only when database supports inserting the same pk's (not sqlite).
    reset_sequences = True
    WAIT_SECONDS = 5
    dump_data_re = re.compile(r'^(\d)+_(.*)\.json')
    DEFAULT_WEBDRIVER = 'selenium.webdriver.chrome.webdriver'

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.selenium = cls.selenium_factory()
        cls.selenium.implicitly_wait(cls.WAIT_SECONDS)
        fixture_dir = settings.FIXTURE_DIRS[0]
        try:
            os.mkdir(fixture_dir)
        except FileExistsError:
            pass

    @classmethod
    def tearDownClass(cls):
        # cls.selenium.quit()
        super().tearDownClass()

    @classmethod
    def selenium_factory(cls):
        # DJK_WEBDRIVER='selenium.webdriver.firefox.webdriver' ./manage.py test
        # DJK_WEBDRIVER='selenium.webdriver.ie.webdriver' ./manage.py test
        # DJK_WEBDRIVER='django_jinja_knockout.webdriver.headless_chrome.webdriver'  ./manage.py test
        # DJK_WEBDRIVER='selenium.webdriver.phantomjs.webdriver' ./manage.py test
        cls.webdriver_name = os.environ.get('DJK_WEBDRIVER', cls.DEFAULT_WEBDRIVER)
        webdriver_module = import_module(cls.webdriver_name)
        return webdriver_module.WebDriver()

    def get_saved_fixtures(self):
        fixture_dir = settings.FIXTURE_DIRS[0]
        saved_fixtures = {}
        for saved_fixture in os.listdir(fixture_dir):
            fixture_path = os.path.join(fixture_dir, saved_fixture)
            if os.path.isfile(fixture_path):
                matches = self.dump_data_re.match(saved_fixture)
                if matches:
                    fix_def = OsFixture(
                        level=int(matches.group(1)),
                        prefix=matches.group(2),
                        mtime=os.path.getmtime(fixture_path),
                        is_loaded=saved_fixture in self.fixtures
                    )
                    if fix_def.prefix in self.fixtures_order and \
                            self.fixtures_order.index(fix_def.prefix) == fix_def.level:
                        saved_fixtures[fix_def.prefix] = fix_def
        return saved_fixtures

    def has_fixture(self, prefix):
        try:
            curr_fix_def = OsFixture(
                level=self.fixtures_order.index(prefix),
                prefix=prefix,
                mtime=0.,
                is_loaded=False,
            )
        except ValueError:
            return False
        saved_fixtures = self.get_saved_fixtures()
        if prefix in saved_fixtures:
            curr_fix_def = saved_fixtures[prefix]
        max_loaded_fix_def = None
        for fix_def in saved_fixtures.values():
            if fix_def.is_loaded and (max_loaded_fix_def is None or max_loaded_fix_def.level < fix_def.level):
                max_loaded_fix_def = fix_def
        if max_loaded_fix_def is None:
            return False
        else:
            return max_loaded_fix_def.mtime >= curr_fix_def.mtime and \
                max_loaded_fix_def.level >= curr_fix_def.level
