import re
import os
import time
from collections import namedtuple
from importlib import import_module

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

from .automation import AutomationCommands
from .utils.regex import finditer_with_separators
from .utils.sdv import str_to_numeric, reverse_enumerate
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


# Selenium commands with errors logging and automation commands support.
class BaseSeleniumCommands(AutomationCommands):

    DEFAULT_SLEEP_TIME = 3

    sync_commands_list = []

    def __init__(self, *args, **kwargs):
        self.testcase = kwargs.pop('testcase')
        self.selenium = self.testcase.selenium
        super().__init__(*args, **kwargs)
        self.logged_error = False
        self.history = []
        self.last_sync_command_key = -1
        # self.sleep_between_commands = 1.2
        self.sleep_between_commands = 0

    def _sleep(self, secs):
        time.sleep(secs)
        return self.last_result

    def _default_sleep(self):
        return self._sleep(self.DEFAULT_SLEEP_TIME)

    def _wait(self, secs):
        self.selenium.implicitly_wait(secs)
        return self.last_result

    def _default_wait(self):
        return self._wait(self.DEFAULT_SLEEP_TIME)

    # https://code.djangoproject.com/wiki/Fixtures
    def _dump_data(self, prefix=''):
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

    def log_command(self, operation, args, kwargs):
        print('Operation: {}'.format(operation), end='')
        if len(args) > 0:
            print(' \\ args: {}'.format(repr(args)), end='')
        if len(kwargs) > 0:
            print(' \\ kwargs: {}'.format(repr(kwargs)), end='')
        print(' \\ Nesting level, current = {}, previous = {}'.format(
            self.nesting_level, self.prev_nesting_level
        ))

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
                # Do not store self.last_result.
                # Wait until slow browser DOM updates.
                self._default_wait()
                if self.sleep_between_commands > 0:
                    batch_exec_time += self.DEFAULT_SLEEP_TIME
                # Redo last commands from the last global command.
                for command in self.history[sync_command_key:]:
                    try:
                        print('Retrying: ')
                        self.log_command(*command)
                        self.last_result, exec_time = super().exec_command(command[0], *command[1], **command[2])
                        batch_exec_time += exec_time
                    except WebDriverException as e:
                        self.log_error(e)
                        raise e
                return self.last_result, batch_exec_time
            self.log_error(e)
            raise e

    def upload_screenshot(self, scr, scr_filename):
        with open(os.path.join(settings.BASE_DIR, 'logs', scr_filename), 'wb') as f:
            f.write(scr)
            f.close()

    def log_error(self, e):
        if self.logged_error is False and isinstance(self.last_result, WebElement):
            now_str = timezone.now().strftime('%Y-%m-%d_%H-%M-%S')
            scr = self.selenium.get_screenshot_as_png()
            scr_filename = 'selenium_error_screen_{}.png'.format(now_str)
            self.upload_screenshot(scr, scr_filename)
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

    def parse_css_classes(self, element=None):
        classes_str = element.get_attribute('class')
        return classes_str.split()

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


# Generic DOM commands.
class SeleniumQueryCommands(BaseSeleniumCommands):

    def _maximize_window(self):
        self.selenium.maximize_window()
        # Should prevent "Element is not clickable at point" error in phantomjs driver due to small window size.
        if self.testcase.webdriver_name == 'selenium.webdriver.phantomjs.webdriver':
            self.selenium.set_window_size(1920, 1080)
        return self.last_result

    def _switch_to_last_window(self):
        self.selenium.switch_to_window(self.selenium.window_handles[-1])
        return self._maximize_window()

    def _switch_to_window(self, title):
        self.selenium.switch_to_window(title)
        return self.last_result

    def _close_current_window(self):
        # default_handle = self.selenium.current_window_handle
        self.selenium.close()
        return self._switch_to_last_window()

    def _relative_url(self, rel_url):
        return self.selenium.get('{}{}'.format(self.testcase.live_server_url, rel_url))

    def _reverse_url(self, viewname, kwargs=None, query=None):
        url = '{}{}'.format(
            self.testcase.live_server_url, reverseq(viewname=viewname, kwargs=kwargs, query=query)
        )
        # print('_reverse_url: {}'.format(url))
        return self.selenium.get(url)

    # Get active element, for example currently opened BootstrapDialog.
    def _to_active_element(self):
        # from selenium.webdriver.support.wait import WebDriverWait
        # http://stackoverflow.com/questions/23869119/python-selenium-element-is-no-longer-attached-to-the-dom
        # self.__class__.selenium.implicitly_wait(3)
        # return self.selenium.switch_to_active_element()
        return self.selenium.switch_to.active_element

    def _by_wait(self, by, key):
        try:
            element = WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until(
                EC.element_to_be_clickable((by, key))
            )
        except WebDriverException as e:
            element = WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until(
                EC.presence_of_element_located((by, key))
            )
        return element

    def _by_id(self, id):
        try:
            return self.selenium.find_element_by_id(id)
        except WebDriverException as e:
            return self._by_wait(By.ID, id)

    def _by_link_text(self, link_text):
        try:
            return self.selenium.find_element_by_link_text(link_text)
        except WebDriverException as e:
            return self._by_wait(By.LINK_TEXT, link_text)

    def _keys(self, keys):
        # Clear is replaced to "Select All" / "Delete" because it has bugs in IE webdriver.
        # self.last_result.clear()
        self.last_result.send_keys(Keys.CONTROL, 'a')
        self.last_result.send_keys(Keys.DELETE)
        self.last_result.send_keys(keys)
        return self.last_result

    def _keys_by_id(self, id, keys):
        self.last_result = self._by_id(id)
        return self._keys(keys)

    def _by_xpath(self, xpath):
        try:
            return self.selenium.find_element_by_xpath(xpath)
        except WebDriverException as e:
            return self._by_wait(By.XPATH, xpath)

    def _by_classname(self, classname):
        try:
            return self.selenium.find_element_by_class_name(classname)
        except WebDriverException as e:
            return self._by_wait(By.CLASS_NAME, classname)

    def _by_css_selector(self, css_selector):
        # Commented out, will not work for multiple elements (no iteration).
        # return self._by_wait(By.CSS_SELECTOR, css_selector)
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
        # A workaround for "Element is not clickable at point" error.
        # http://stackoverflow.com/questions/11908249/debugging-element-is-not-clickable-at-point-error
        # https://github.com/seleniumhq/selenium-google-code-issue-archive/issues/2766
        # https://github.com/SeleniumHQ/selenium/issues/1867
        # https://github.com/SeleniumHQ/selenium/issues/2077
        # https://jkotests.wordpress.com/2015/03/20/element-is-not-clickable-due-to-another-element-that-would-receive-the-click/
        # http://learn-automation.com/how-to-solve-element-is-not-clickable-at-pointxy-in-selenium/

        # if self.testcase.webdriver_name == 'selenium.webdriver.firefox.webdriver':
        self.selenium.execute_script(
            'window.scrollTo(' + str(self.last_result.location['x']) + ', ' + str(self.last_result.location['y']) + ')'
        )

        # ActionChains(self.selenium).move_to_element(self.last_result)
        # http://stackoverflow.com/questions/29377730/executing-a-script-in-selenium-python
        # http://stackoverflow.com/questions/34562061/webdriver-click-vs-javascript-click
        """
        self.selenium.execute_script(
            'arguments[0].click();', self.last_result
        )
        """
        self.last_result.click()

        return self.last_result

    def _button_click(self, button_title):
        self.last_result = self._by_xpath(
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

    def _component_by_classpath(self, classpath):
        return self._by_xpath(
            self.format_xpath(
                '//*[@data-component-class={classpath}]', classpath=classpath
            )
        )

    def _relative_button_click(self, button_title):
        self.last_result = self._relative_by_xpath(
            self.format_xpath('.//button[contains(., {})]', button_title)
        )
        return self._click()

    def _form_by_view(self, viewname, kwargs=None, query=None):
        return self._by_xpath(
            self.format_xpath(
                '//form[@action={action}]',
                action=reverseq(viewname=viewname, kwargs=kwargs, query=query)
            )
        )

    def _relative_form_button_click(self, button_title):
        return self.exec(
            'relative_by_xpath', ('ancestor-or-self::form//button[contains(., {})]', button_title,),
            'click'
        )

    def _click_submit_by_view(self, viewname, kwargs=None, query=None):
        self.last_result = self._by_xpath(
            self.format_xpath(
                '//form[@action={action}]//button[@type="submit"]',
                action=reverseq(viewname=viewname, kwargs=kwargs, query=query)
            )
        )
        return self._click()


# BootstrapDialog / AJAX grids specific commands.
class DjkSeleniumCommands(SeleniumQueryCommands):

    sync_commands_list = [
        'click',
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

    def _to_top_bootstrap_dialog(self):
        WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '.bootstrap-dialog'))
        )
        dialogs = self._by_css_selector('.bootstrap-dialog')
        top_key = None
        z_indexes = []
        for key, dialog in enumerate(dialogs):
            styles = self.parse_css_styles(dialog)
            z_indexes.append(styles.get('z-index', 0))
            if dialog.is_displayed():
                if top_key is None:
                    top_key = key
                else:
                    if z_indexes[key] > z_indexes[top_key]:
                        top_key = key
        if top_key is None:
            raise WebDriverException('Cannot find top bootstrap dialog')
        else:
            return dialogs[top_key]

    def _wait_until_dialog_closes(self):
        try:
            WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until_not(
                EC.presence_of_element_located((By.XPATH, '//div[@class="modal-backdrop fade"]'))
            )
        except WebDriverException:
            WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until_not(
                EC.presence_of_element_located((By.XPATH, '//div[@class="modal-header bootstrap-dialog-draggable"]'))
            )
        return self.last_result

    def _fk_widget_click(self, id):
        return self.exec(
            'by_id', (id,),
            'relative_by_xpath', ('following-sibling::button',),
            'click',
            'to_top_bootstrap_dialog',
            # 'to_active_element',
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

    # Returns back to current component top node.
    def _to_component(self):
        return self.exec(
            'relative_by_xpath', ('ancestor::*[@class="component"]',),
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

    # $x(".//tr [ .//td[@data-caption='Title' and text()='Yaroslavl Bears'] and .//td[@data-caption='First name' and text()='Ivan'] ]")
    def _grid_find_data_row(self, columns):
        xpath_str = './/tr [ '
        xpath_args = []
        first_elem = True
        for caption, value in columns.items():
            if first_elem:
                first_elem = False
            else:
                xpath_str += ' and '
            xpath_str += './/td[@data-caption={} and text()={}]'
            xpath_args.extend([
                caption, value
            ])
        xpath_str += ' ]'
        return self._relative_by_xpath(xpath_str, *xpath_args)

    def _grid_select_current_row(self):
        self.last_result = self.exec(
            'relative_by_xpath', ('ancestor-or-self::tr//td[@data-bind="click: onSelect"]/span',),
        )
        if 'glyphicon-unchecked' in self.parse_css_classes(self.last_result):
            return self._click()
        else:
            return self.last_result

    def _grid_row_glyphicon_action(self, action_name):
        return self.exec(
            'relative_by_xpath', (
                'ancestor-or-self::tr//td[@data-bind="click: function() {{ doAction({{gridRow: $parent}}); }}"]/span[@title={}]',
                action_name,
            ),
            'click',
        )

    def _grid_search_substring(self, substr):
        return self.exec(
            'relative_by_xpath', ('.//input[@type="search"]',),
            'keys', (substr,),
        )

    def _grid_order_by(self, verbose_name):
        return self.exec(
            'relative_by_xpath', (
                './/thead//a[contains(@class, "halflings-before sort-") and text() = {}]', verbose_name,
            ),
            'click',
            # Return back to the grid top component, otherwise consequitive call will fail.
            'to_component',
        )

    def _grid_breadcrumb_filter_choices(self, filter_name, filter_choices):
        grid_filter = self._relative_by_xpath(
            './/*[@data-bind="foreach: gridFilters"]//li[@class="bold" and text() = {}]/ancestor::*[@data-bind="grid_filter"]',
            filter_name
        )
        for filter_choice in filter_choices:
            self.last_result = grid_filter
            self.exec(
                'relative_by_xpath', (
                    './/a[text() = {}]', filter_choice,
                ),
                'click',
            )
        return grid_filter

    def _grid_goto_page(self, page):
        return self.exec(
            'relative_by_xpath', (
                './/*[@data-bind="foreach: gridPages"]//a[text() = {}]', page,
            ),
            'click',
            # Return back to the grid top component, otherwise consequitive call will fail.
            # 'relative_by_xpath', ('ancestor::*[@class="component"]',),
        )

    def _fk_widget_add_and_select(self, fk_id, add_commands, select_commands):
        commands = \
            (
                'fk_widget_click', (fk_id,),
                'grid_button_action_click', ('Add',),
            ) + add_commands + \
            (
                'dialog_button_click', ('Save',),
                'to_top_bootstrap_dialog',
            ) + select_commands + \
            (
                'grid_select_current_row',
                'dialog_button_click', ('Apply',),
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
    DEFAULT_WEBDRIVER = 'selenium.webdriver.firefox.webdriver'

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
