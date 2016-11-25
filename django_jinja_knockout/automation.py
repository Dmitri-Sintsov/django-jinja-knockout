class AutomationCommands:

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.last_result = None

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
        return self.get_command(operation)(*args, **kwargs)

    def exec(self, *args):
        for operation, args, kwargs in self.yield_commands(*args):
            self.last_result = self.exec_command(operation, *args, **kwargs
            )
        return self.last_result
