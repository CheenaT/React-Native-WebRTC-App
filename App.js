/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from "react";
import { Platform, StyleSheet, Text, View, ScrollView, Button } from "react-native";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices
} from "react-native-webrtc";
import firebase from "firebase";

var firebaseConfig = {
  apiKey: "AIzaSyDwqSDQWCTOp09YCMP9chPWtm3osLHvdvQ",
  authDomain: "video-chat-react-native-webrtc.firebaseapp.com",
  databaseURL: "https://video-chat-react-native-webrtc.firebaseio.com",
  projectId: "video-chat-react-native-webrtc",
  storageBucket: "video-chat-react-native-webrtc.appspot.com",
  messagingSenderId: "180830668645",
  appId: "1:180830668645:web:575f3a19dc7b6514"
};
firebase.initializeApp(firebaseConfig);
var database = firebase.database().ref();
var yourId = Math.floor(Math.random() * 1000000000);
const configuration = {
  iceServers: [{ url: "stun:stun.l.google.com:19302" }]
};
const pc = new RTCPeerConnection(configuration);
pc.onicecandidate = event => {
  // send event.candidate to peer
  event.candidate
    ? sendMessage(yourId, JSON.stringify({ ice: event.candidate }))
    : console.log("Sent All Ice");
};
readMessage = (data) => {
  var msg = JSON.parse(data.val().message);
  var sender = data.val().sender;
  if (sender != yourId) {
    if (msg.ice != undefined) pc.addIceCandidate(new RTCIceCandidate(msg.ice));
    else if (msg.sdp.type == "offer")
      pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer))
        .then(() =>
          sendMessage(yourId, JSON.stringify({ sdp: pc.localDescription }))
        );
    else if (msg.sdp.type == "answer")
      pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
  }
}
database.on("child_added", readMessage);

const instructions = Platform.select({
  ios: "Press Cmd+R to reload,\n" + "Cmd+D or shake for dev menu",
  android:
    "Double tap R on your keyboard to reload,\n" +
    "Shake or press menu button for dev menu"
});



type Props = {};
export default class App extends Component<Props> {
  state = {
    videoURL: null,
    isFront: true,
    logs: "nothing"
  };

  componentDidMount() {
    const { isFront } = this.state;
    mediaDevices.enumerateDevices().then(sourceInfos => {
      console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == "video" &&
          sourceInfo.facing == (isFront ? "front" : "back")
        ) {
          videoSourceId = sourceInfo.id;
        }
      }
      mediaDevices
        .getUserMedia({
          audio: true,
          video: {
            mandatory: {
              minWidth: 500, // Provide your own width, height and frame rate here
              minHeight: 300,
              minFrameRate: 30
            },
            facingMode: isFront ? "user" : "environment",
            optional: videoSourceId ? [{ sourceId: videoSourceId }] : []
          }
        })
        .then(stream => {
          console.log("Streaming OK", stream);
          this.setState({
            videoURL: stream.toURL()
          });
          pc.addStream(stream);
        })
        .catch(error => {
          // Log error
        });
    });
    pc.onaddstream = event => this.setState({ videoURL: event.stream.toURL() });
    sendMessage = (senderId, data) => {
      var msg = database.push({ sender: senderId, message: data });
      msg.remove();
    }
  }
  showPartnerFace = () => {
    pc.createOffer().then(desc => {
      pc.setLocalDescription(desc).then(() => {
        // Send pc.localDescription to peer
        //this.setState({logs: pc.localDescription});
        sendMessage(yourId, JSON.stringify({ sdp: pc.localDescription }));
      });
    });
  }
  render() {
    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <RTCView streamURL={this.state.videoURL} style={styles.container} />
        <View style={{ width: "45%", margin: 100, alignSelf: 'center', backgroundColor: "red", borderRadius: 4, color: 'white' }}>
          <Button
            onPress={this.showPartnerFace}
            style={{
                fontSize: '0.875rem',
                fontFamily: 'Roboto',
              }}
            title="START VIDEO CALL"
            color="#fff"
            accessibilityLabel=""
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    height: 420,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000"
  },
  welcome: {
    fontSize: 20,
    textAlign: "center",
    margin: 10
  },
});
