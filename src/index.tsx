import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import toNumber from 'lodash/toNumber';
import get from 'lodash/get';
import { RadioButtonField, FieldGroup } from '@contentful/forma-36-react-components';
import { init, FieldExtensionSDK } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import '@contentful/forma-36-tokens/dist/css/index.css';
import './index.css';

type Orientation = 'portrait' | 'landscape' | 'square';

interface Size {
  width: number,
  height: number,
}

interface SizeItem extends Size {
  orientation: Orientation,
}

const sizes: SizeItem[] = [
  { orientation: 'portrait', width: 50, height: 70 },
  { orientation: 'portrait', width: 40, height: 50 },
  { orientation: 'portrait', width: 38, height: 57 },
  { orientation: 'portrait', width: 38, height: 52 },
  { orientation: 'portrait', width: 30, height: 40 },
  { orientation: 'portrait', width: 21, height: 30 },
  { orientation: 'portrait', width: 10.5, height: 14.8 },

  { orientation: 'landscape', width: 70, height: 50 },
  { orientation: 'landscape', width: 50, height: 40 },
  { orientation: 'landscape', width: 40, height: 30 },
  { orientation: 'landscape', width: 30, height: 21 },
  { orientation: 'landscape', width: 14.8, height: 10.5 },

  { orientation: 'square', width: 50, height: 50 },
  { orientation: 'square', width: 23, height: 23 },
];

const getInitialSize = (): Size => ({ width: 0, height: 0 })

const parseSize = (size: string) => size.split('x');

const defaultOrientation: Orientation = 'portrait';

interface AppProps {
  sdk: FieldExtensionSDK,
}

interface Value {
  size: Size,
  orientation: Orientation,
}

const App: React.FC<AppProps> = ({ sdk }) => {
  const sdkValue = sdk.field.getValue();
  const initialSize = getInitialSize();
  const initialValue = sdkValue ? sdkValue : { size: initialSize, orientation: defaultOrientation };

  const [value, setValue] = useState<Value>(initialValue);

  const onSave = useCallback((newValue: Value) => {
    sdk.field.setValue(newValue);

    setValue(newValue);
  }, [sdk.field]);

  const onChange = (val: string) => {
    const size = parseSize(val);
    const width = toNumber(size[0]);
    const height = toNumber(size[1]);
    const newSize = { width, height };

    const newValue = { size: newSize, orientation: value.orientation };

    onSave(newValue);
  };

  const currentValue = `${value.size.width}x${value.size.height}`

  useEffect(() => {
    sdk.window.startAutoResizer();

    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);

  useEffect(() => {
    const orientationField = sdk.entry.fields.orientation;

    const detachValueChangeHandler = orientationField.onValueChanged((orientation: Orientation = defaultOrientation) => {
      if (value.orientation === orientation) return; // prevent initial change

      const size = getInitialSize();

      const newValue = { size, orientation };

      onSave(newValue);
    });

    return () => detachValueChangeHandler();
  }, [onSave, sdk.entry.fields.orientation, value.orientation]);

  return (
    <div className="App">
      <div className="App__content">
        <FieldGroup>
          {
            sizes
              .filter((size) => size.orientation === value.orientation)
              .map((size) => {
                const value = `${size.width}x${size.height}`;

                return (
                  <RadioButtonField
                    key={value}
                    labelText={value}
                    labelIsLight
                    name={value}
                    checked={value === currentValue}
                    value={value}
                    id={value}
                    onChange={(event) => onChange(get(event, 'target.value'))}
                  />
                );
              })
          }
        </FieldGroup>
      </div>
    </div>
  );
};

init((sdk: FieldExtensionSDK) => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById('root'));
});
