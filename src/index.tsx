import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import toNumber from 'lodash/toNumber';
import get from 'lodash/get';
import { RadioButtonField, FieldGroup } from '@contentful/forma-36-react-components';
import { init, FieldExtensionSDK } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import '@contentful/forma-36-tokens/dist/css/index.css';
import './index.css';

const locale = 'en-US';

type Orientation = 'portrait' | 'landscape' | 'square';

type FrameColor = 'white' | 'black' | 'gold' | 'wood' | 'no_frame';

interface Size {
  width: number;
  height: number;
}

interface SizeItem extends Size {
  orientation: Orientation;
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
  { orientation: 'square', width: 23, height: 23 }
];

const getInitialSize = (): Size => ({ width: 50, height: 70 });

const parseSize = (size: string) => size.split('x');

const defaultOrientation: Orientation = 'portrait';

interface AppProps {
  sdk: FieldExtensionSDK;
}

interface PosterSettingsItem {
  size: Size;
  frame: FrameColor;
}

type PostersSettings = PosterSettingsItem[];

interface Entry {
  sys: {
    id: string;
    linkType: string;
    type: string;
  };
}

interface LocalizedField {
  [key: string]: string;
}

interface PosterEntry {
  sys: {
    id: string;
  };
  fields: {
    title: LocalizedField;
    previewSmall: {
      [key: string]: Entry;
    };
  };
}

interface AssetEntry {
  sys: {
    id: string;
  };
  fields: {
    file: {
      [key: string]: { url: string };
    };
  };
}

interface Poster {
  id: string;
  title: string;
  previewSmall: string;
}

interface BuildPosterProps {
  id: string;
  title: string;
  previewSmall: string;
}

const buildPoster = ({ id, title, previewSmall }: BuildPosterProps): Poster => {
  const poster = { id, title, previewSmall };

  return poster;
};

const buildPosters = async (sdk: FieldExtensionSDK, data: PosterEntry[]): Promise<Poster[]> => {
  const iter = async (accumulator: Poster[], list: PosterEntry[]): Promise<Poster[]> => {
    if (list.length === 0) return accumulator;

    const entry = list[0];
    const title = entry.fields.title[locale];
    const assetId = entry.fields.previewSmall[locale].sys.id;
    const assetEntry = ((await sdk.space.getAsset(assetId)) as unknown) as AssetEntry;
    const file = assetEntry.fields.file[locale].url;

    const poster = buildPoster({ id: entry.sys.id, title, previewSmall: file });

    return iter([...accumulator, poster], list.slice(1));
  };

  const result = await iter([], data);

  return result;
};

interface UsePostersResult {
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Poster[];
}

enum FetchingState {
  Idle = 'IDLE',
  Loading = 'LOADING',
  Success = 'SUCCESS',
  Error = 'ERROR'
}

const usePosters = (sdk: FieldExtensionSDK): UsePostersResult => {
  console.log('usePosters RENDER!!!');

  const [fetchingState, setFetchingState] = useState<FetchingState>(FetchingState.Idle);
  const [data, setData] = useState<Poster[]>([]);

  const postersField = sdk.entry.fields.posters;
  const postersEntries: Entry[] = postersField.getValue();

  const requests = useMemo(() => postersEntries.map(entry => sdk.space.getEntry(entry.sys.id)), [
    sdk,
    postersEntries
  ]);

  const fetchPosters = useCallback(async () => {
    setFetchingState(FetchingState.Loading);

    try {
      const data = ((await Promise.all(requests)) as unknown) as PosterEntry[];
      const posters = await buildPosters(sdk, data);

      setData(posters);

      setFetchingState(FetchingState.Success);
    } catch (error) {
      setFetchingState(FetchingState.Error);
    }
  }, [requests, sdk]);

  useEffect(() => {
    fetchPosters();
  }, [fetchPosters]);

  const isIdle = fetchingState === FetchingState.Idle;
  const isLoading = fetchingState === FetchingState.Loading;
  const isSuccess = fetchingState === FetchingState.Success;
  const isError = fetchingState === FetchingState.Error;

  const result = useMemo(() => ({ isIdle, isLoading, isSuccess, isError, data }), [
    isIdle,
    isLoading,
    isSuccess,
    isError,
    data
  ]);

  return result;
};

const App: React.FC<AppProps> = ({ sdk }) => {
  const sdkValue = sdk.field.getValue();
  const initialValue = sdkValue ? sdkValue : [];
  const postersFetchingState = usePosters(sdk);

  console.log('postersFetchingState:', postersFetchingState.data);

  const [value, setValue] = useState<PostersSettings>(initialValue);

  // const onSave = useCallback(
  //   (newValue: Value) => {
  //     sdk.field.setValue(newValue);
  //
  //     setValue(newValue);
  //   },
  //   [sdk.field]
  // );

  // const onChange = (val: string) => {
  //   const size = parseSize(val);
  //   const width = toNumber(size[0]);
  //   const height = toNumber(size[1]);
  //   const newSize = { width, height };
  //
  //   const newValue = { size: newSize, orientation: value.orientation };
  //
  //   onSave(newValue);
  // };

  // const currentValue = `${value.size.width}x${value.size.height}`;

  useEffect(() => {
    sdk.window.startAutoResizer();

    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);

  // useEffect(() => {
  //   const orientationField = sdk.entry.fields.orientation;
  //
  //   const detachValueChangeHandler = orientationField.onValueChanged(
  //     (orientation: Orientation = defaultOrientation) => {
  //       if (value.orientation === orientation) return; // prevent initial change
  //
  //       const size = getInitialSize();
  //
  //       const newValue = { size, orientation };
  //
  //       onSave(newValue);
  //     }
  //   );
  //
  //   return () => detachValueChangeHandler();
  // }, [onSave, sdk.entry.fields.orientation, value.orientation]);

  return (
    <div className="App">
      <div className="App__content">Here goes something</div>
    </div>
  );
};

init((sdk: FieldExtensionSDK) => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById('root'));
});
