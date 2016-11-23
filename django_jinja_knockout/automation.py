class AutomationCommands:

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.last_result = None

    def yield_commands(self, *args):
        method_name = None
        last_opcode = None
        for key, opcode in enumerate(args):
            if isinstance(opcode, str):
                method_name = opcode
                if key == len(args) - 1 or isinstance(args[key + 1], str):
                    yield method_name, (), {}
            elif key == 0:
                raise ValueError('method name is not a string: {}'.format(repr(opcode)))
            elif isinstance(opcode, (tuple, list)):
                if key == len(args) - 1 or not isinstance(args[key + 1], dict):
                    yield method_name, opcode, {}
            elif isinstance(opcode, dict):
                if isinstance(last_opcode, (tuple, list)):
                    yield method_name, last_opcode, opcode
                else:
                    yield method_name, (), opcode
            else:
                raise ValueError(
                    'Invalid opcode, should be str (method name), tuple (method args) or dict (method kwagrs)')
            last_opcode = opcode

    def get_local_method_name(self, method_name):
        return '_{}'.format(method_name)

    def get_command(self, method_name):
        local_method_name = self.get_local_method_name(method_name)
        if not hasattr(self, local_method_name):
            raise ValueError('Undefined attribute: {}'.format(local_method_name))
        method = getattr(self, local_method_name)
        if not callable(method):
            raise ValueError('Uncallable method: {}'.format(local_method_name))
        return method

    def exec(self, *args):
        for method_name, args, kwargs in self.yield_commands(*args):
            self.last_result = self.get_command(method_name)(*args, **kwargs)
        return self.last_result
