#!/bin/bash
#fastfetch
#exec bash

#!/bin/bash

SESSION_FLAG="/tmp/.ghostty_fastfetch_$(id -u)_$(pgrep -n ghostty)"

if [ ! -f "$SESSION_FLAG" ]; then
    fastfetch
    touch "$SESSION_FLAG"
fi

exec zsh

#!/bin/bash
ghostty &
