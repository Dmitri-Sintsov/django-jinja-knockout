from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException

from djk_ui import testing_components as djk_ui_testing_components

from .tpl import reverseq


class FormCommands:

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
        self.context = self._by_xpath(
            self.format_xpath(
                '//form[@action={action}]//button[@type="submit"]',
                action=reverseq(viewname=viewname, kwargs=kwargs, query=query)
            )
        )
        return self._click()


class ComponentCommands:

    def _component_by_classpath(self, classpath):
        self.context = self._by_xpath(
            self.format_xpath(
                '//*[@data-component-class={classpath}]', classpath=classpath
            )
        )
        self.context.component = self.context.element
        return self.context

    def _component_by_id(self, id):
        self.context = self._by_id(id)
        self.context.component = self.context.element
        return self.context

    def _component_relative_by_xpath(self, xpath, *args, **kwargs):
        self.context.element = self.relative_by_xpath(
            self.context.component, xpath, *args, **kwargs
        )
        return self.context

    def _component_button_click(self, button_title):
        self.context.element = self.relative_by_xpath(
            self.context.component, './/button[contains(., {})]', button_title
        )
        return self._click()


class DialogCommands(djk_ui_testing_components.DialogCommands):

    def _to_top_bootstrap_dialog(self):
        WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '.bootstrap-dialog'))
        )
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
            self.context.element = dialogs[top_key]
            self.context.dialog = self.context.element
            return self.context

    def _dialog_relative_by_xpath(self, xpath, *args, **kwargs):
        self.context.element = self.relative_by_xpath(
            self.context.dialog, xpath, *args, **kwargs
        )
        return self.context

    def _dialog_is_component(self):
        self.context.component = self.context.dialog
        return self.context

    def _dialog_body_button_click(self, button_title):
        return self.exec(
            # 'to_active_element',
            'to_top_bootstrap_dialog',
            'dialog_relative_by_xpath', (
                './/div[@class="bootstrap-dialog-body"]//button[contains(., {})]',
                button_title,
            ),
            'click',
        )

    def _dialog_input_range_right(self, num):
        return self.exec(
            'dialog_relative_by_xpath', (
                './/input[@type="range"]',
            ),
            'keys', (Keys.RIGHT,) * num
        )

    def _wait_until_dialog_closes(self):
        try:
            WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until_not(
                EC.presence_of_element_located((By.XPATH, '//div[@class="modal-backdrop fade"]'))
            )
        except WebDriverException:
            WebDriverWait(self.selenium, self.DEFAULT_SLEEP_TIME).until_not(
                EC.presence_of_element_located((By.XPATH, '//div[@class="modal-header bootstrap-dialog-draggable"]'))
            )
        return self.context


class GridCommands:

    def _grid_button_action(self, action_name):
        return self.exec(
            'component_relative_by_xpath', (
                './/ul[contains(concat(" ", @class, " "), " grid-controls ")]'
                '//span[text()={}]/parent::button',
                action_name
            ),
            'click',
        )

    def _grid_pagination_action(self, action_name):
        return self.exec(
            'component_relative_by_xpath', (
                './/*[contains(concat(" ", @class, " "), " pagination ")]//span[@title={}]', action_name,
            ),
            'click',
            'default_sleep',
            'default_wait',
        )

    # $x(
    #     ".//tr [" +
    #     "   .//*[@data-caption='Title' and @class='grid-cell']/text()='Yaroslavl Bears' and " +
    #     "   .//*[@data-caption='First name' and @class='grid-cell']/text()='Ivan'" +
    #     " ]"
    # )
    def _grid_find_data_row(self, columns):
        xpath_str = './/tr [ '
        xpath_args = []
        first_elem = True
        for caption, value in columns.items():
            if first_elem:
                first_elem = False
            else:
                xpath_str += ' and '
            xpath_str += './/*[@data-caption={} and @class="grid-cell"]/text()={}'
            xpath_args.extend([
                caption, value
            ])
        xpath_str += ' ]'
        self.context = self._component_relative_by_xpath(xpath_str, *xpath_args)
        self.context.grid_row = self.context.element
        return self.context

    def _grid_row_relative_by_xpath(self, xpath, *args, **kwargs):
        self.context.element = self.relative_by_xpath(
            self.context.grid_row, xpath, *args, **kwargs
        )
        return self.context

    def _grid_select_current_row(self):
        self.context = self._grid_row_relative_by_xpath(
            './/td[@data-bind="click: onSelect"]/span'
        )
        if 'iconui-unchecked' in self.parse_css_classes(self.context.element):
            return self._click()
        else:
            return self.context

    def _grid_row_iconui_action(self, action_name):
        return self.exec(
            'grid_row_relative_by_xpath', (
                './/td[contains(@class, "grid-glypicon-actions")]/span[@title={}]',
                action_name,
            ),
            'click',
            'default_sleep',
            'default_wait',
        )

    def _grid_search_substring(self, substr):
        return self.exec(
            'component_relative_by_xpath', (
                './/input[@type="search"]',
            ),
            'all_keys', (substr,),
            'click',
            'default_sleep',
            'default_wait',
        )

    def _grid_order_by(self, verbose_name):
        return self.exec(
            'component_relative_by_xpath', (
                './/thead//a[contains(@class, "iconui-ctrl-before") and contains(@class, "sort-") and text() = {}]',
                verbose_name,
            ),
            'click',
            # Wait until AJAX result is complete.
            'default_sleep',
            'default_wait',
        )

    def _grid_dropdown_filter_click(self, filter_name):
        return self.exec(
            'component_relative_by_xpath', (
                './/*[@class="nav navbar-nav grid-controls"]'
                '//*[@data-bind="text: name" and text() = {}]'
                '/ancestor::*[contains(@data-bind, "click: onDropdownClick.bind($data)")]',
                filter_name
            ),
            'click',
            'relative_by_xpath', (
                './/ancestor::*[contains(@data-bind, "grid_filter")]',
                filter_name
            ),
        )

    def _grid_dropdown_filter_choices(self, filter_name, filter_choices):
        self.context = self._grid_dropdown_filter_click(filter_name)
        grid_filter = self.context.element
        for filter_choice in filter_choices:
            self.context.element = self.relative_by_xpath(
                grid_filter,
                './/a[text() = {}]', filter_choice,
            )
            self._click()
        self.context.element = grid_filter
        # Wait until AJAX result is complete.
        return self.exec(
            'default_sleep',
            'default_wait',
        )

    def _grid_breadcrumb_filter_choices(self, filter_name, filter_choices):
        grid_filter = self.relative_by_xpath(
            self.context.component,
            './/*[@class="nav navbar-nav grid-controls"]//li[@class="bold pr-2" and text() = {}]/ancestor::*[@data-bind="grid_filter"]',
            filter_name
        )
        for filter_choice in filter_choices:
            self.context.element = self.relative_by_xpath(
                grid_filter,
                './/a[text() = {}]', filter_choice,
            )
            self._click()
        self.context.element = grid_filter
        return self.exec(
            'default_sleep',
            'default_wait',
        )

    def _grid_tabs_filter_choices(self, filter_name, filter_choices):
        grid_filter = self.relative_by_xpath(
            self.context.component,
            './/*[@class="nav navbar-nav grid-controls"]//a[@data-bind="text: name" and text() = {}]/ancestor::*[@data-bind="grid_filter"]',
            filter_name
        )
        for filter_choice in filter_choices:
            self.context.element = self.relative_by_xpath(
                grid_filter,
                './/a[text() = {}]', filter_choice,
            )
            self._click()
        self.context.element = grid_filter
        return self.exec(
            'default_sleep',
            'default_wait',
        )

    def _grid_goto_page(self, page):
        return self.exec(
            'component_relative_by_xpath', (
                './/*[contains(concat(" ", @class, " "), " pagination ")]//a[text() = {}]', page,
            ),
            'click',
            'default_sleep',
            'default_wait',
        )

    def _element_is_grid_row(self):
        self.context.grid_row = self.context.element
        return self.context
