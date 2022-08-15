import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Flex,
  SkeletonContainer,
  SkeletonBodyText,
  SectionHeading,
  FieldGroup,
  RadioButtonField
} from '@contentful/forma-36-react-components';
import isEqual from 'lodash/isEqual';
import { init, FieldExtensionSDK } from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import '@contentful/forma-36-tokens/dist/css/index.css';
import './index.css';

const locale = 'ru-RU';

type Orientation = 'portrait' | 'landscape' | 'square';

type FrameColor = 'white' | 'black' | 'wood' | 'no_frame';

const frames: FrameColor[] = ['white', 'black', 'wood', 'no_frame'];

interface Size {
  width: number;
  height: number;
}

const stringifySize = (width: number, height: number): string => `${width}x${height}`;

interface AppProps {
  sdk: FieldExtensionSDK;
}

interface PosterSettingsItem {
  posterId: string;
  size?: Size;
  frame?: FrameColor;
}

interface PostersSettings {
  [key: string]: PosterSettingsItem | undefined;
}

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

  const postersField = useMemo(() => sdk.entry.fields.posters, [sdk]);
  const initialPostersEntries = useMemo(() => (postersField.getValue() ?? []) as Entry[], [
    postersField
  ]);

  const [postersEntries, setPostersEntries] = useState<Entry[]>(initialPostersEntries);

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
    const detachValueChangeHandler = postersField.onValueChanged((entries: Entry[] = []) => {
      if (isEqual(entries, postersEntries)) return; // prevent initial change

      setPostersEntries(entries);
    });

    return () => detachValueChangeHandler();
  }, [postersField, postersEntries]);

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

const useAutoResizer = (sdk: FieldExtensionSDK): void => {
  useEffect(() => {
    sdk.window.startAutoResizer();

    return () => sdk.window.stopAutoResizer();
  }, [sdk.window]);
};

interface UsePostersSettingsResult {
  postersSettings: PostersSettings;
  onChangePostersSettings: (settings: PostersSettings) => void;
  postersFetchingState: UsePostersResult;
}

const usePostersSettings = (sdk: FieldExtensionSDK): UsePostersSettingsResult => {
  const sdkValue = sdk.field.getValue();
  const initialValue = sdkValue ? sdkValue : {};

  const [postersSettings, setPostersSettings] = useState<PostersSettings>(initialValue);
  const onChangePostersSettings = useCallback(
    (settings: PostersSettings) => {
      sdk.field.setValue(settings);
      setPostersSettings(settings);
    },
    [sdk.field]
  );

  const postersFetchingState = usePosters(sdk);

  const posters = postersFetchingState.data;

  useEffect(() => {
    if (!postersFetchingState.isSuccess) return;

    const existingPostersIds = posters.map(poster => poster.id);

    const newPostersSettings = Object.keys(postersSettings).reduce<PostersSettings>(
      (accumulator, posterId) => {
        if (!existingPostersIds.includes(posterId)) return accumulator;

        const currentData = postersSettings[posterId];

        const newAccumulator = { ...accumulator, [posterId]: currentData };

        return newAccumulator;
      },
      {}
    );

    if (isEqual(postersSettings, newPostersSettings)) return;

    onChangePostersSettings(newPostersSettings);
  }, [posters, postersSettings, onChangePostersSettings, postersFetchingState]);

  const result = useMemo(
    () => ({
      postersSettings,
      onChangePostersSettings,
      postersFetchingState
    }),
    [postersSettings, onChangePostersSettings, postersFetchingState]
  );

  return result;
};

const App: React.FC<AppProps> = ({ sdk }) => {
  const { postersSettings, onChangePostersSettings, postersFetchingState } = usePostersSettings(
    sdk
  );

  const onChangeSize = useCallback(
    (posterId: string, size: Size) => {
      const currentData = postersSettings[posterId] ?? { posterId };

      const newValue = { ...postersSettings, [posterId]: { ...currentData, size } };

      onChangePostersSettings(newValue);
    },
    [postersSettings, onChangePostersSettings]
  );

  const onChangeFrame = useCallback(
    (posterId: string, frame: FrameColor) => {
      const currentData = postersSettings[posterId] ?? { posterId };

      const newValue = { ...postersSettings, [posterId]: { ...currentData, frame } };

      onChangePostersSettings(newValue);
    },
    [postersSettings, onChangePostersSettings]
  );

  useAutoResizer(sdk);

  return (
    <div className="App">
      {postersFetchingState.isLoading && (
        <SkeletonContainer>
          <SkeletonBodyText numberOfLines={5} />
        </SkeletonContainer>
      )}

      {postersFetchingState.isSuccess && (
        <Flex flexDirection="column">
          {postersFetchingState.data.map(poster => {
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
                            const id = `${poster.id}-${value}`;
                            const posterSettings = postersSettings[poster.id];
                            const isChecked =
                              posterSettings?.size?.width === size.width &&
                              posterSettings?.size.height === size.height;

                            return (
                              <RadioButtonField
                                key={value}
                                labelText={value}
                                labelIsLight
                                name={id}
                                checked={isChecked}
                                value={value}
                                id={id}
                                onChange={() =>
                                  onChangeSize(poster.id, {
                                    width: size.width,
                                    height: size.height
                                  })
                                }
                              />
                            );
                          })}
                        </FieldGroup>
                      </div>

                      <div className="App__control">
                        <FieldGroup row>
                          {frames.map(frame => {
                            const id = `${poster.id}-${frame}`;
                            const posterSettings = postersSettings[poster.id];
                            const isChecked = posterSettings?.frame === frame;

                            return (
                              <RadioButtonField
                                key={frame}
                                labelText={frame}
                                labelIsLight
                                name={id}
                                checked={isChecked}
                                value={frame}
                                id={id}
                                onChange={() => onChangeFrame(poster.id, frame)}
                              />
                            );
                          })}
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
