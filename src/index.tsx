import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import toNumber from 'lodash/toNumber';
import get from 'lodash/get';
import {
  Flex,
  SkeletonContainer,
  SkeletonBodyText,
  SectionHeading,
  FieldGroup,
  RadioButtonField
} from '@contentful/forma-36-react-components';
import { init, FieldExtensionSDK } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import '@contentful/forma-36-tokens/dist/css/index.css';
import './index.css';

const locale = 'en-US';

type Orientation = 'portrait' | 'landscape' | 'square';

type FrameColor = 'white' | 'black' | 'wood' | 'no_frame';

const frames: FrameColor[] = ['white', 'black', 'wood', 'no_frame'];

interface Size {
  width: number;
  height: number;
}

const getInitialSize = (): Size => ({ width: 50, height: 70 });

const stringifySize = (width: number, height: number): string => `${width}x${height}`;
const parseSize = (size: string) => size.split('x');

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
    sizes: {
      [key: string]: {
        sizes: Size[];
        orientation: Orientation;
      };
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
  orientation: Orientation;
  sizes: Size[];
}

interface BuildPosterProps {
  id: string;
  title: string;
  previewSmall: string;
  orientation: Orientation;
  sizes: Size[];
}

const buildPoster = ({ id, title, previewSmall, orientation, sizes }: BuildPosterProps): Poster => {
  const poster = { id, title, previewSmall, orientation, sizes };

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
    const sizes = entry.fields.sizes[locale].sizes;
    const orientation = entry.fields.sizes[locale].orientation;

    const poster = buildPoster({ id: entry.sys.id, title, previewSmall: file, orientation, sizes });

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

  const posters = postersFetchingState.data;

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
      {postersFetchingState.isLoading && (
        <SkeletonContainer>
          <SkeletonBodyText numberOfLines={5} />
        </SkeletonContainer>
      )}

      {postersFetchingState.isSuccess && (
        <Flex flexDirection="column">
          {posters.map(poster => {
            return (
              <Flex key={poster.id} flexDirection="column" className="App__panel">
                <Flex flexDirection="row">
                  <div className="App__title">
                    <SectionHeading>{poster.title}</SectionHeading>
                  </div>
                </Flex>

                <Flex flexDirection="row">
                  <div
                    className={`App__preview App__preview_orientation_${poster.orientation}`}
                    style={{ backgroundImage: `url("${poster.previewSmall}")` }}
                  />

                  <div className="App__controls">
                    <Flex flexDirection="column">
                      <div className="App__control">
                        <FieldGroup row>
                          {poster.sizes.map(size => {
                            const value = stringifySize(size.width, size.height);

                            return (
                              <RadioButtonField
                                key={value}
                                labelText={value}
                                labelIsLight
                                name={value}
                                checked={false}
                                value={value}
                                id={value}
                              />
                            );
                          })}
                        </FieldGroup>
                      </div>

                      <div className="App__control">
                        <FieldGroup row>
                          {frames.map(frame => (
                            <RadioButtonField
                              key={frame}
                              labelText={frame}
                              labelIsLight
                              name={frame}
                              checked={false}
                              value={frame}
                              id={frame}
                            />
                          ))}
                        </FieldGroup>
                      </div>
                    </Flex>
                  </div>
                </Flex>
              </Flex>
            );
          })}
        </Flex>
      )}
    </div>
  );
};

init((sdk: FieldExtensionSDK) => {
  ReactDOM.render(<App sdk={sdk} />, document.getElementById('root'));
});
