/* jshint curly:true, debug:true */
/* globals $, firebase */

/**
 * -------------------
 * cafe一覧画面関連の関数
 * -------------------
 */

// cafeの表紙画像をダウンロードする
const downloadCafeImage = cafeImageLocation => firebase
  .storage()
  .ref(cafeImageLocation)
  .getDownloadURL() // cafe-images/abcdef のようなパスから画像のダウンロードURLを取得
  .catch((error) => {
    console.error('写真のダウンロードに失敗:', error);
  });

// cafeの表紙画像を表示する
const displayCafeImage = ($divTag, url) => {
  $divTag.find('.cafe-item__image').attr({
    src: url,
  });
};

const backgroudCafeImage = ($divTag, url) => {
  $divTag.css('background-image',`url(${url})`);
};

// Realtime Database の cafes からcafe一覧を削除する
const deleteCafe = (cafeId) => {
  firebase
    .database()
    .ref(`cafes/${cafeId}`)
    .remove();
};

// cafe一覧の表示用のdiv（jQueryオブジェクト）を作って返す
const createCafeDiv = (cafeId, cafeData) => {
  // HTML内のテンプレートからコピーを作成する
  const $divTag = $('#cafe-template > .cafe-item').clone();

  // cafe一覧タイトルを表示する
  // : 変更後のカフェデータが持つプロパティをページ上に表示する
  $divTag.find('.cafe-item__title').text(cafeData.cafeTitle);
  $divTag.find('.cafe-item__features').text(cafeData.cafeFeatures);
  $divTag.find('.cafe-item__businesshours').text(cafeData.cafeBusinesshours);
  $divTag.find('.cafe-item__address').text(cafeData.cafeAddress);


  // cafe一覧の表紙画像をダウンロードして表示する
  downloadCafeImage(cafeData.cafeImageLocation).then((url) => {
    displayCafeImage($divTag, url);
    backgroudCafeImage($divTag, url);
  });

  // id属性をセット
  $divTag.attr('id', `cafe-id-${cafeId}`);

  // 削除ボタンのイベントハンドラを登録
  const $deleteButton = $divTag.find('.cafe-item__delete');
  $deleteButton.on('click', () => {
    deleteCafe(cafeId);
  });

  return $divTag;
};

// cafe一覧画面内のcafelistデータをクリア
const resetCafeshelfView = () => {
  $('#cafe-list').empty();
};

// cafe一覧画面にcafelistデータを表示する
const addCafe = (cafeId, cafeData) => {
  const $divTag = createCafeDiv(cafeId, cafeData);
  $divTag.appendTo('#cafe-list');
  
};


// cafe一覧画面の初期化、イベントハンドラ登録処理
const loadCafeshelfView = () => {
  resetCafeshelfView();

  // cafe一覧データを取得
  // : books以外の場所を参照する
  const cafesRef = firebase
    .database()
    .ref('cafes')
    .orderByChild('createdAt');

  // 過去に登録したイベントハンドラを削除
  cafesRef.off('child_removed');
  cafesRef.off('child_added');

  // cafes の child_removedイベントハンドラを登録
  // （データベースから書籍が削除されたときの処理）
  cafesRef.on('child_removed', (cafeSnapshot) => {
    const cafeId = cafeSnapshot.key;
    const $cafe = $(`#cafe-id-${cafeId}`);

    // : cafe一覧画面から該当のcafelistデータを削除する
    $(`#cafe-id-${cafeId}`).remove();
  });

  // cafes の child_addedイベントハンドラを登録
  // （データベースに書籍が追加保存されたときの処理）
  cafesRef.on('child_added', (cafeSnapshot) => {
    const cafeId = cafeSnapshot.key;
    const cafeData = cafeSnapshot.val();

    // cafe一覧画面にカフェ一覧データを表示する
    addCafe(cafeId, cafeData);
  });
};

/**
 * ----------------------
 * すべての画面共通で使う関数
 * ----------------------
 */

// ビュー（画面）を変更する
const showView = (id) => {
  $('.view').hide();
  $(`#${id}`).fadeIn();

  if (id === 'cafeshelf') {
    loadCafeshelfView();
  }
};

/**
 * -------------------------
 * ログイン・ログアウト関連の関数
 * -------------------------
 */

// ログインフォームを初期状態に戻す
const resetLoginForm = () => {
  $('#login__help').hide();
  $('#login__submit-button')
    .prop('disabled', false)
    .text('ログイン');
};

// ログインした直後に呼ばれる
const onLogin = () => {
  console.log('ログイン完了');

  // cafe一覧画面を表示
  showView('cafeshelf');
};

// ログアウトした直後に呼ばれる
const onLogout = () => {
  const cafesRef = firebase.database().ref('cafes');

  // 過去に登録したイベントハンドラを削除
  cafesRef.off('child_removed');
  cafesRef.off('child_added');

  showView('login');
};

/**
 * ------------------
 * イベントハンドラの登録
 * ------------------
 */

// ログイン状態の変化を監視する
firebase.auth().onAuthStateChanged((user) => {
  // ログイン状態が変化した
  if (user) {
    // ログイン済
    onLogin();
  } else {
    // 未ログイン
    onLogout();
  }
});

// ログインフォームが送信されたらログインする
$('#login-form').on('submit', (e) => {
  e.preventDefault();

  const $loginButton = $('#login__submit-button');
  $loginButton.text('送信中…');

  const email = $('#login-email').val();
  const password = $('#login-password').val();

  // ログインを試みる
  firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      // ログインに成功したときの処理
      console.log('ログインしました。');

      // ログインフォームを初期状態に戻す
      resetLoginForm();
    })
    .catch((error) => {
      // ログインに失敗したときの処理
      console.error('ログインエラー', error);

      $('#login__help')
        .text('ログインに失敗しました。')
        .show();

      // ログインボタンを元に戻す
      $loginButton.text('ログイン');
    });
});

// ログアウトボタンが押されたらログアウトする
$('.logout-button').on('click', () => {
  firebase
    .auth()
    .signOut()
    .catch((error) => {
      console.error('ログアウトに失敗:', error);
    });
});

/**
 * -------------------------
 * cafe一覧情報追加モーダル関連の処理
 * -------------------------
 */

// cafe一覧の登録モーダルを初期状態に戻す
const resetAddCafeModal = () => {
  $('#cafe-form')[0].reset();
  $('#add-cafe-image-label').text('');
  $('#submit_add_cafe')
    .prop('disabled', false)
    .text('保存する');
};

// 選択した表紙画像の、ファイル名を表示する
$('#add-cafe-image').on('change', (e) => {
  const input = e.target;
  const $label = $('#add-cafe-image-label');
  const file = input.files[0];

  if (file != null) {
    $label.text(file.name);
  } else {
    $label.text('ファイルを選択');
  }
});

// cafe一覧の登録処理
$('#cafe-form').on('submit', (e) => {
  e.preventDefault();

  // cafe一覧の登録ボタンを押せないようにする
  $('#submit_add_cafe')
    .prop('disabled', true)
    .text('送信中…');

  // cafe一覧タイトル
  
  // : 変更後の登録ダイアログが持つ入力項目の値を取得する
  const cafeTitle = $('#add-cafe-title').val();
  const cafeFeatures = $('#add-cafe-features').val();
  const cafeBusinesshours = $('#add-cafe-businesshours').val();
  const cafeAddress = $('#add-cafe-address').val();
  const cafeMap = $('#add-cafe-map').val();

  const $cafeImage = $('#add-cafe-image');
  const { files } = $cafeImage[0];

  if (files.length === 0) {
    // ファイルが選択されていないなら何もしない
    return;
  }

  const file = files[0]; // 表紙画像ファイル
  const filename = file.name; // 画像ファイル名
  const cafeImageLocation = `cafe-images/${filename}`; // 画像ファイルのアップロード先

  // cafe一覧データを保存する
  firebase
    .storage()
    .ref(cafeImageLocation)
    .put(file) // Storageへファイルアップロードを実行
    .then(() => {
      // Storageへのアップロードに成功したら、Realtime Databaseにcafe一覧データを保存する
      
      // : 変更後の登録ダイアログが持つ入力項目の値を使用する
      const cafeData = {
        cafeTitle,
        cafeFeatures,
        cafeBusinesshours,
        cafeAddress,
        cafeImageLocation,
        cafeMap,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      };
      // : cafes以外の場所に登録する
      return firebase
        .database()
        .ref('cafes')
        .push(cafeData);
    })
    .then(() => {
      // cafe一覧画面のcafe一覧の登録モーダルを閉じて、初期状態に戻す
      $('#add-cafe-modal').modal('hide');
      resetAddCafeModal();
    })
    .catch((error) => {
      // 失敗したとき
      console.error('エラー', error);
      resetAddCafeModal();
      $('#add-cafe__help')
        .text('保存できませんでした。')
        .fadeIn();
    });
});

