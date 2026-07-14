import config from '@root/config.json' with { type: 'json' };
import lang from '@root/lang.json' with { type: 'json' };

const Channel = config.Channel;
const Message = config.Message;
const Role = config.Role;
const Apply = lang.Apply;

export { 
    config,
    lang,
    Channel,
    Message,
    Role,
    Apply
};
