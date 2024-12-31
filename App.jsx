import React, {useRef} from 'react';
import {View, StatusBar, StyleSheet, BackHandler, Alert} from 'react-native';
import {WebView} from 'react-native-webview';
import {Linking} from 'react-native';
//
import {PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';
const App = () => {
  const WEBVIEW_ENDPOINT = 'https://academie-app.vercel.app/dashboard';
  const webViewRef = useRef();
  const navigationStateRef = React.useRef({canGoBack: false});

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (webViewRef.current && navigationStateRef.current.canGoBack) {
          webViewRef.current.goBack();
          return true;
        } else {
          Alert.alert(
            'Exit App',
            'Are you sure you want to exit?',
            [
              {text: 'Cancel', onPress: () => {}, style: 'cancel'},
              {text: 'OK', onPress: () => BackHandler.exitApp()},
            ],
            {cancelable: false},
          );
          return true;
        }
      },
    );

    return () => backHandler.remove();
  }, []);

  // to get permission
  // const requestStoragePermission = async () => {
  //   if (Platform.OS === 'android') {
  //     const granted = await PermissionsAndroid.request(
  //       PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  //       {
  //         title: 'Storage Permission Required',
  //         message: 'This app needs access to your storage to download files.',
  //       },
  //     );
  //     return granted === PermissionsAndroid.RESULTS.GRANTED;
  //   }
  //   return true; // No need for permission on iOS
  // };

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      // For Android 13 and above (API level 33+)
      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ]);

        return Object.values(result).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED,
        );
      }
      // For Android 12 and below
      else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to your storage to download files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const downloadFile = async url => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Storage permission is required to download files.',
        );
        return;
      }

      // Get filename from URL
      const filename = url.substring(url.lastIndexOf('/') + 1);

      // Create app folder path
      const appFolder = 'Academie';
      const basePath = `${RNFS.DownloadDirectoryPath}/${appFolder}`;

      // Create Academie folder if it doesn't exist
      try {
        if (!(await RNFS.exists(basePath))) {
          await RNFS.mkdir(basePath);
        }
      } catch (error) {
        console.error('Error creating directory:', error);
      }

      // Final download path
      const downloadPath = `${basePath}/${filename}`;

      // Show download started alert
      Alert.alert('Download Started', 'The file is being downloaded...');

      const options = {
        fromUrl: url,
        toFile: downloadPath,
        background: true,
        begin: res => {
          console.log('Download started:', res);
        },
        progress: res => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          console.log(`Download progress: ${progress}%`);
        },
      };

      const response = await RNFS.downloadFile(options).promise;

      if (response.statusCode === 200) {
        const exists = await RNFS.exists(downloadPath);
        if (exists) {
          // const fileInfo = await RNFS.stat(downloadPath);

          Alert.alert(
            'Download Complete',
            'Open the downloaded file?',
            [
              {
                text: 'Close',
                style: 'cancel',
              },
              {
                text: 'Open File',
                onPress: () => {
                  if (Platform.OS === 'android') {
                    // Get file extension to determine MIME type
                    const fileExtension = filename
                      .split('.')
                      .pop()
                      .toLowerCase();
                    let mimeType = '*/*';

                    // Set appropriate MIME type based on file extension
                    switch (fileExtension) {
                      case 'pdf':
                        mimeType = 'application/pdf';
                        break;
                      case 'png':
                      case 'jpg':
                      case 'jpeg':
                        mimeType = 'image/*';
                        break;
                      case 'mp4':
                        mimeType = 'video/*';
                        break;
                      // Add more cases as needed
                    }

                    // Open the specific file
                    Linking.sendIntent('android.intent.action.VIEW', [
                      {
                        data: `file://${downloadPath}`,
                        type: mimeType,
                      },
                    ]).catch(error => {
                      console.error('Error opening file:', error);
                      Alert.alert('Error', 'Could not open the file');
                    });
                  }
                },
              },
            ],
            {cancelable: true},
          );
        } else {
          throw new Error('File not found after download');
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Download Failed',
        'An error occurred while downloading the file.',
      );
    }
  };

  const onMessage = event => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'download') {
        downloadFile(data.url);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00ACEF" />
      <WebView
        ref={webViewRef}
        viewportContent={'width=device-width, user-scalable=no'}
        originWhitelist={[
          'http://*',
          'https://*',
          'tel:*',
          'mailto:*',
          'upi:*',
        ]}
        startInLoadingState={true}
        source={{uri: WEBVIEW_ENDPOINT}}
        onMessage={onMessage}
        thirdPartyCookiesEnabled={true}
        setBuiltInZoomControls={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        cacheEnabled={true}
        overScrollMode={'never'}
        cacheMode={'LOAD_NO_CACHE'}
        // onFileDownload={({nativeEvent: {downloadUrl}}) =>
        //   downloadDocument(downloadUrl)
        // }
        onShouldStartLoadWithRequest={request => {
          if (!request.url.startsWith(WEBVIEW_ENDPOINT)) {
            Linking.openURL(request.url);
            return false;
          }
          return true;
        }}
        onNavigationStateChange={navState => {
          navigationStateRef.current = navState;
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Match the status bar background color
  },
});

export default App;
