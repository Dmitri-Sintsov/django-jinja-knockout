import re
import os
import time
from collections import namedtuple

from selenium.webdriver.firefox.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.remote.webelement import WebElement

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
        return self._sleep(self.__class__.DEFAULT_SLEEP_TIME)

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
                    time.sleep(unsleep_time)
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
                self._default_sleep()
                if self.sleep_between_commands > 0:
                    batch_exec_time += self.__class__.DEFAULT_SLEEP_TIME
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

    def log_error(self, e):
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


# Generic DOM commands.
class SeleniumQueryCommands(BaseSeleniumCommands):

    def _maximize_window(self):
        self.selenium.maximize_window()
        return self.last_result

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

    def _by_id(self, id):
        return self.selenium.find_element_by_id(id)

    def _by_link_text(self, link_text):
        return self.selenium.find_element_by_link_text(link_text)

    def _keys_by_id(self, id, keys):
        input = self.selenium.find_element_by_id(id)
        input.clear()
        input.send_keys(keys)
        return input

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
        self.last_result.click()
        return self.last_result

    def _button_click(self, button_title):
        self.last_result = self.selenium.find_element_by_xpath(
            self.format_xpath('//button[contains(., {})]', button_title)
        )
        return self._click()

    def _find_anchor_by_view(self, viewname, kwargs=None, query=None):
        return self.selenium.find_element_by_xpath(
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

    def _form_by_view(self, viewname, kwargs=None, query=None):
        return self.selenium.find_element_by_xpath(
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
        self.last_result = self.selenium.find_element_by_xpath(
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
        dialogs = self.selenium.find_elements_by_css_selector('.bootstrap-dialog')
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
        return WebDriver()

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
