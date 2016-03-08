def get_fqn(obj):
    return '.'.join([obj.__module__, obj.__class__.__qualname__])
