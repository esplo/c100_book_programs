import React, { FC, useMemo } from 'react';

type Props = {
    type: 'info' | 'error' | 'link';
    msg: string;
    link?: string;
};

export const Output: FC<Props> = (props) => {
    if (props.type === 'info') {
        return (<div style={{ color: 'black' }}>{props.msg}</div>)
    }
    else if (props.type === 'error') {
        return (<div style={{ color: 'red' }}>{props.msg}</div>)
    }
    else if (props.type === 'link') {
        return (<div><a href={props.link!}>{props.msg}</a></div>)
    }

    return (<div></div>)
};
