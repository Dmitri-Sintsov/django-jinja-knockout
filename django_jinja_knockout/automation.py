class AutomationCommands:

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.last_result = None

    def exec(self, *args):
        self.last_result = None
        method = None
        last_opcode = None
        for key, opcode in enumerate(args):
            if isinstance(opcode, str):
                method = getattr(self, 'do_{}'.format(opcode))
                if key == len(args) - 1 or isinstance(args[key + 1], str):
                    self.last_result = method()
            elif isinstance(opcode, (tuple, list)):
                if key == len(args) - 1 or not isinstance(args[key + 1], dict):
                    self.last_result = method(*opcode)
            elif isinstance(opcode, dict):
                if isinstance(last_opcode, (tuple, list)):
                    self.last_result = method(*last_opcode, **opcode)
                else:
                    self.last_result = method(**opcode)
            else:
                raise ValueError(
                    'Invalid opcode, should be str (method name), tuple (method args) or dict (method kwagrs)')
            last_opcode = opcode
