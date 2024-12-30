import React, {useRef} from 'react';
import {View, StatusBar, StyleSheet, BackHandler, Alert} from 'react-native';
import {WebView} from 'react-native-webview';

const App = () => {
  const WEBVIEW_ENDPOINT = 'https://academie-app.vercel.app/dashboard';
  const webViewRef = useRef();
  const navigationStateRef = React.useRef({canGoBack: false});

  let downloadDocument = async downloadUrl => {
    let fileURI = await downloadAsync(downloadUrl, `${documentDirectory}`, {});
    await onShare(fileURI.uri);
  };

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
        thirdPartyCookiesEnabled={true}
        setBuiltInZoomControls={false}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowingReadAccessToURL={true}
        mixedContentMode="always"
        cacheEnabled={true}
        overScrollMode={'never'}
        cacheMode={'LOAD_NO_CACHE'}
        onFileDownload={({nativeEvent: {downloadUrl}}) =>
          downloadDocument(downloadUrl)
        }
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
