class AutomationCommands:

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.last_result = None

    def yield_commands(self, *args):
        method = None
        last_opcode = None
        for key, opcode in enumerate(args):
            if isinstance(opcode, str):
                method = getattr(self, '_{}'.format(opcode))
                if key == len(args) - 1 or isinstance(args[key + 1], str):
                    yield method, (), {}
            elif isinstance(opcode, (tuple, list)):
                if key == len(args) - 1 or not isinstance(args[key + 1], dict):
                    yield method, opcode, {}
            elif isinstance(opcode, dict):
                if isinstance(last_opcode, (tuple, list)):
                    yield method, last_opcode, opcode
                else:
                    yield method, (), opcode
            else:
                raise ValueError(
                    'Invalid opcode, should be str (method name), tuple (method args) or dict (method kwagrs)')
            last_opcode = opcode

    def exec(self, *args):
        for method, args, kwargs in self.yield_commands(*args):
            self.last_result = method(*args, **kwargs)
        return self.last_result
