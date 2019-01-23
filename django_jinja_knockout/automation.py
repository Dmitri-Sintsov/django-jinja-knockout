import inspect
import time
from types import SimpleNamespace


class AutomationCommands:

    def __init__(self, *args, **kwargs):
        self.context = SimpleNamespace()
        self.nesting_level = 0
        self.prev_nesting_level = 0
        self.set_parameters(kwargs.pop('context', {}))

    # Use self._ in your commands args / kwargs for parametric arguments.
    def set_parameters(self, context):
        self._ = SimpleNamespace(**context)
        return self

    @classmethod
    def yield_command_names(cls):
        for name, _value in inspect.getmembers(cls):
            if callable(getattr(cls, name)) and name.startswith('_') and not name.startswith('__'):
                yield name[1:]

    def yield_commands(self, *args):
        operation = None
        last_opcode = None
        for key, opcode in enumerate(args):
            if isinstance(opcode, str):
                operation = opcode
                if key == len(args) - 1 or isinstance(args[key + 1], str):
                    yield operation, (), {}
            elif key == 0:
                raise ValueError('method name is not a string: {}'.format(repr(opcode)))
            elif isinstance(opcode, (tuple, list)):
                if key == len(args) - 1 or not isinstance(args[key + 1], dict):
                    yield operation, opcode, {}
            elif isinstance(opcode, dict):
                if isinstance(last_opcode, (tuple, list)):
                    yield operation, last_opcode, opcode
                else:
                    yield operation, (), opcode
            else:
                raise ValueError(
                    'Invalid opcode, should be str (method name), tuple (method args) or dict (method kwagrs)')
            last_opcode = opcode

    def get_method_name(self, operation):
        return '_{}'.format(operation)

    def get_command(self, operation):
        method_name = self.get_method_name(operation)
        if not hasattr(self, method_name):
            raise ValueError('Undefined attribute: {}'.format(method_name))
        method = getattr(self, method_name)
        if not callable(method):
            raise ValueError('Uncallable method: {}'.format(method_name))
        return method

    def exec_command(self, operation, *args, **kwargs):
        self.prev_nesting_level = self.nesting_level
        self.nesting_level += 1
        try:
            start_time = time.process_time()
            context = self.get_command(operation)(*args, **kwargs)
            exec_time = time.process_time() - start_time
        except Exception as e:
            e.exec_time = time.process_time() - start_time
            self.nesting_level -= 1
            raise e
        self.nesting_level -= 1
        return context, exec_time

    def exec(self, *args):
        batch_exec_time = 0
        for operation, args, kwargs in self.yield_commands(*args):
            self.context, exec_time = self.exec_command(operation, *args, **kwargs)
            batch_exec_time += exec_time
        return self.context

    def yield_class_commands(self, *attrs):
        for attr_name in attrs:
            attr = getattr(self, attr_name)
            if callable(attr):
                yield from attr()
            else:
                yield attr

    def exec_class(self, cmd_obj, *attrs):
        for commands in cmd_obj.yield_class_commands(*attrs):
            self.exec(*commands)
        return self
