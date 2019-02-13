sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"jquery.sap.global",
	"sap/m/ObjectMarker",
	"sap/m/MessageToast",
	"sap/m/UploadCollectionParameter",
	"sap/m/library",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/format/FileSizeFormat"
], function (Controller, jQuery, ObjectMarker, MessageToast, UploadCollectionParameter, MobileLibrary, JSONModel, FileSizeFormat) {
	"use strict";

	return Controller.extend("com.pabz.PresentazioneDomanda.controller.Main", {

		uploadJSON: {},
		onInit: function () {
			this.getView().setModel(new JSONModel({
				"items": []
			}), "file");

			this.getView().setModel(new JSONModel({
				"maximumFilenameLength": 80,
				"maximumFileSize": 10,
				"mode": MobileLibrary.ListMode.SingleSelectMaster,
				"uploadEnabled": true,
				"uploadButtonVisible": true,
				"enableEdit": true,
				"enableDelete": true,
				"visibleEdit": true,
				"visibleDelete": true,
				"listSeparatorItems": [
					MobileLibrary.ListSeparators.All,
					MobileLibrary.ListSeparators.None
				],
				"showSeparators": MobileLibrary.ListSeparators.All,
				"listModeItems": [{
					"key": MobileLibrary.ListMode.SingleSelectMaster,
					"text": "Single"
				}, {
					"key": MobileLibrary.ListMode.MultiSelect,
					"text": "Multi"
				}]
			}), "settings");

			this.getView().setModel(new JSONModel({
				"items": ["jpg", "txt", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "pdf", "png"],
				"selected": ["jpg", "txt", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "pdf", "png"]
			}), "fileTypes");

			// Sets the text to the label
			this.byId("UploadCollection").addEventDelegate({
				onBeforeRendering: function () {
					this.byId("attachmentTitle").setText(this.getAttachmentTitleText());
				}.bind(this)
			});
		},

		onAfterRendering: function () {
			//this.oModel = this.getView().getModel();
		},

		// ---------------------------------------------------------------------------------- Start funzioni generiche
		onTableAChange: function (oEvent) {
			var oModel = this.getView().getModel();
			var tableA = oModel.getProperty("/tableA");
			var totalA = oModel.getProperty("/totalA");
			totalA = this._getTotal(tableA, totalA);
			oModel.setProperty("/totalA", totalA);
			this.getView().setModel(oModel);
		},

		onTableBChange: function (oEvent) {
			var oModel = this.getView().getModel();
			var table = oModel.getProperty("/tableB");
			var total = oModel.getProperty("/totalB");
			total = this._getTotal(table, total);
			oModel.setProperty("/totalB", total);
			this.getView().setModel(oModel);
		},

		_getTotal: function (table, total) {
			total = 0;
			for (var i in table) {
				if (table[i].importoEuro !== "" && !isNaN(table[i].importoEuro[0])) {

					total = total + table[i].importoEuro[0];

				}
			}
			return total;
		},

		onUserInfo: function (oEvent) {

			var oModel = this.getView().getModel();
			var data = oModel.getData();

			if (data.piva !== "" && data.fiscalCode !== "") {

				var oDataModel = this.getView().getModel("oData");
				var sPath = "/userInfoSet(Piva='" + data.piva + "',Cf='" + data.fiscalCode + "')";
				oDataModel.read(sPath, {
					"success": function (oData) {
						oModel.setProperty("/surname", oData.Cognome);
						oModel.setProperty("/name", oData.Nome);
						oModel.setProperty("/owner", oData.RagioneSociale);
						oModel.setProperty("/piva", oData.Piva);
						oModel.setProperty("/fiscalCode", oData.Cf);
						oModel.setProperty("/state", oData.Country);
						oModel.setProperty("/region", oData.Region);
						oModel.setProperty("/postcode", oData.Cap);
						oModel.setProperty("/city", oData.Citta);
						oModel.setProperty("/district", oData.Bezei);
						oModel.setProperty("/street", oData.Indirizzo);
						oModel.setProperty("/streetNumber", oData.NumeroCivico);
						oModel.setProperty("/telephone", oData.Telefono);
						oModel.setProperty("/mail", oData.Email);
						oModel.setProperty("/pec", oData.EmailPec);
						oModel.setProperty("/iban", oData.Iban);
						this.getView().setModel(oModel);
					}.bind(this),
					"error": function (err) {
						//MessageBox.error(err.message);
						console.log(err.message);
					}
				});
			}
		},

		// ---------------------------------------------------------------------------------- End funzioni generiche

		// ---------------------------------------------------------------------------------- Start funzioni WF 
		completeTask: function (approvalStatus) {

			var taskId = this.getOwnerComponent().taskId;
			var instanceId = this.getOwnerComponent().instanceId;
			var token = this._fetchToken();
			var oModel = this.getView().getModel();
			oModel.setProperty("/confirm", approvalStatus);

			if (taskId === null) {

				if (instanceId === undefined) {

					oModel.setProperty("/Azienda", "Azienda"); // Andrà sostituito con gruppo Azienda

					// creo il task id
					$.ajax({
						url: "/bpmworkflowruntime/rest/v1/workflow-instances",
						method: "POST",
						contentType: "application/json",
						async: false,
						data: JSON.stringify({
							definitionId: "bando",
							context: oModel.getData()
						}),
						headers: {
							"X-CSRF-Token": token
						},
						success: function (result, xhr, data) {
							this.getOwnerComponent().instanceId = result.id;
							this._taskIdfromInstance(result.id, token, true);
						}.bind(this)
					});

				} else {
					this._taskIdfromInstance(instanceId, token, true);
				}

			} else {
				this._completeTask(taskId, oModel, token);
			}

		},

		_completeTask: function (taskId, oModel, token) {

			var dataContext;

			// se chiamo la Patch devo completare il task!
			dataContext = JSON.stringify({
				status: "COMPLETED",
				context: oModel.getData()
			});

			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/task-instances/" + taskId,
				method: "PATCH",
				contentType: "application/json",
				async: false,
				data: dataContext,
				headers: {
					"X-CSRF-Token": token
				},
				success: function (result, xhr, data) {
					sap.m.MessageToast.show("Task Saved");
					this.getView().setBusy(false);
					this.getOwnerComponent().taskId = null;
				}.bind(this),
				error: function (oError) {}
			});
		},

		_taskIdfromInstance: function (instanceId, token, toComplete) {

			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/task-instances?workflowInstanceId=" + instanceId,
				method: "GET",
				async: false,
				headers: {
					"X-CSRF-Token": token
				},
				success: function (result, xhr, data) {
					var oModel = this.getView().getModel();
					this.getOwnerComponent().taskId = result[result.length - 1].id;
					if (toComplete) {
						this._completeTask(this.getOwnerComponent().taskId, oModel, token);
					}
				}.bind(this),
				error: function (oError) {}
			});
		},

		_fetchToken: function () {
			var token;
			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/xsrf-token",
				method: "GET",
				async: false,
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				success: function (result, xhr, data) {
					token = data.getResponseHeader("X-CSRF-Token");
				}
			});
			return token;
		},

		getTaskId: function () {
			return jQuery.sap.getUriParameters().get("taskid");
		},

		getInstanceId: function (taskId) {

			var token = this._fetchToken();
			$.ajax({
				url: "/bpmworkflowruntime/rest/v1/task-instances/" + taskId,
				method: "GET",
				async: false,
				headers: {
					"X-CSRF-Token": token
				},
				success: function (result, xhr, data) {
					return result[0].workflowInstanceId;
				}
			});

		},
		// ---------------------------------------------------------------------------------- End funzioni WF 

		// ---------------------------------------------------------------------------------- Start Azioni Toolbar
		onSave: function () {
			this.getView().setBusy(true);
			if (!this.onCheck()) {
				this.completeTask(false);
			} else {
				this.getView().setBusy(false);
				var msg = 'Inserire dati obbligatori';
				MessageToast.show(msg);
			}
		},

		onConfirm: function () {
			this.getView().setBusyIndicatorDelay(0);
			this.getView().setBusy(true);
			if (!this.onCheck()) {
				this.completeTask(false);
				this.requestCreation();
			} else {
				this.getView().setBusy(false);
				var msg = 'Inserire dati obbligatori';
				MessageToast.show(msg);
			}

		},
		requestCreation: function () {

			var oModel = this.getView().getModel("oData");
			oModel.setUseBatch(true);
			var changeSetId = "abc";
			oModel.setDeferredGroups([changeSetId]);
			var mParameters = {
				"groupId": changeSetId,
				"changeSetId": changeSetId
			};

			var batchSuccess = function (oData) {
				var reqGuid = oData.__batchResponses[0].__changeResponses[0].data.Guid;
				this.getView().getModel().setProperty("/guid", reqGuid);
				this.completeTask(true);
				sap.m.MessageToast.show("Richiesta creata");
				this.getView().byId("btn_save").setEnabled(false);
				this.getView().byId("btn_confirm").setEnabled(false);
			}.bind(this);

			var batchError = function (err) {
				this.getView().setBusy(false);
				sap.m.MessageBox.error(err.message);
			}.bind(this);

			this._odataHeaderCreate(mParameters);
			this._odataItemsCreate(mParameters);
			this._odataTextCreate(mParameters);
			this._odataDocCreate(mParameters);
			oModel.submitChanges({
				"groupId": changeSetId,
				//"changeSetId": changeSetId,
				"success": batchSuccess,
				"error": batchError
			});
		},

		_odataHeaderCreate: function (param) {

			var oModel = this.getView().getModel();
			var oDataModel = this.getView().getModel("oData");
			var entity = {};
			entity["Piva"] = oModel.getProperty("/piva");
			entity["Addetti9"] = oModel.getProperty("/until9");
			entity["ProcessType"] = "GAP";
			entity["Addetti49"] = oModel.getProperty("/between9and49");
			entity["Description"] = "Test SCP - oData";
			entity["SettoreA"] = oModel.getProperty("/craft");
			entity["SettoreI"] = oModel.getProperty("/industry");
			entity["SettoreC"] = oModel.getProperty("/trade");
			entity["SettoreS"] = oModel.getProperty("/services");
			entity["SettoreL"] = oModel.getProperty("/freelance");
			entity["Zzfld00000z"] = oModel.getProperty("/stamp_duty_id");
			if (oModel.getProperty("/stamp_duty_date") !== "") {
				entity["Zzfld000010"] = oModel.getProperty("/stamp_duty_date");
			}
			if (oModel.getProperty("/newFactory")) {
				entity["Zzfld000007"] = "X";
			}
			if (oModel.getProperty("/increaseFactory")) {
				entity["Zzfld000008"] = "X";
			}
			if (oModel.getProperty("/newGood")) {
				entity["Zzfld000009"] = "X";
			}
			if (oModel.getProperty("/newProcess")) {
				entity["Zzfld00000a"] = "X";
			}
			if (oModel.getProperty("/claim3_1")) {
				entity["Zzfld00000g"] = "X";
			}
			if (oModel.getProperty("/claim3_1")) {
				entity["Zzfld000012"] = "X";
			}
			if (oModel.getProperty("/claim3_2")) {
				entity["Zzfld000013"] = "X";
			}
			if (oModel.getProperty("/claim3_3")) {
				entity["Zzfld000014"] = "X";
			}

			// dati questionario
			if (oModel.getProperty("/score30_1")) {
				entity["Zzfld00001x"] = "X";
			}
			if (oModel.getProperty("/score30_2")) {
				entity["Zzfld00001y"] = "X";
			}
			if (oModel.getProperty("/score30_3")) {
				entity["Zzfld00001z"] = "X";
			}
			if (oModel.getProperty("/score30_4")) {
				entity["Zzfld000020"] = "X";
			}
			if (oModel.getProperty("/score30_5")) {
				entity["Zzfld000021"] = "X";
			}
			if (oModel.getProperty("/score15_1")) {
				entity["Zzfld000027"] = "X";
			}
			if (oModel.getProperty("/score15_2_1")) {
				entity["Zzfld000028"] = "X";
			}
			if (oModel.getProperty("/score15_2_2")) {
				entity["Zzfld000029"] = "X";
			}
			if (oModel.getProperty("/score15_2_3")) {
				entity["Zzfld00002a"] = "X";
			}
			if (oModel.getProperty("/score15_3")) {
				entity["Zzfld00002b"] = "X";
			}
			if (oModel.getProperty("/score10_1")) {
				entity["Zzfld00002h"] = "X";
			}
			if (oModel.getProperty("/score10_2_1")) {
				entity["Zzfld00002i"] = "X";
			}
			if (oModel.getProperty("/score10_2_4")) {
				entity["Zzfld00002j"] = "X";
			}
			if (oModel.getProperty("/score10_2_5")) {
				entity["Zzfld00002k"] = "X";
			}
			if (oModel.getProperty("/score10_2_6")) {
				entity["Zzfld00002l"] = "X";
			}
			if (oModel.getProperty("/score10_2_7")) {
				entity["Zzfld00002m"] = "X";
			}
			if (oModel.getProperty("/score10_3")) {
				entity["Zzfld00002n"] = "X";
			}

			entity["Zzfld00002x"] = this.getOwnerComponent().instanceId;

			oDataModel.create("/nuovaRichiestaSet", entity, param);

		},

		_odataItemsCreate: function (param) {
			var oModel = this.getView().getModel();
			var oDataModel = this.getView().getModel("oData");
			var tableA = oModel.getProperty("/tableA");
			var entity;
			for (var i in tableA) {
				if (tableA[i].importoEuro !== "" && !isNaN(tableA[i].importoEuro[0])) {

					entity = {};
					entity["Description"] = tableA[i].tipologia;
					if (tableA[i].inizio !== "") {
						entity["DataInizio"] = tableA[i].inizio;
					}
					if (tableA[i].fine !== "") {
						entity["DataFine"] = tableA[i].fine;
					}
					entity["Importo"] = tableA[i].importoEuro[0].toString();
					entity["Zzfld00000e"] = "A"; //tipo investiemnto (A, B, S)

					oDataModel.create("/posizioniRichiestaSet", entity, param);
				}
			}

			var tableB = oModel.getProperty("/tableB");

			for (var i in tableB) {

				if (tableB[i].importoEuro !== "" && !isNaN(tableB[i].importoEuro[0])) {
					entity = {};
					entity["Description"] = tableB[i].tipologia;
					if (tableB[i].inizio !== "") {
						entity["DataInizio"] = tableB[i].inizio;
					}
					if (tableB[i].fine !== "") {
						entity["DataFine"] = tableB[i].fine;
					}
					entity["Importo"] = tableB[i].importoEuro[0].toString();
					entity["Zzfld000002"] = tableB[i].luogo; //luogo
					//entity["ZzinvType"] =  ; //tipo inv
					entity["Zzfld00000e"] = "B"; //tipo investiemnto (A, B, S)

					oDataModel.create("/posizioniRichiestaSet", entity, param);
				}
			}

			var tableS = oModel.getProperty("/claim3_tbl");

			for (var i in tableS) {

				if (tableS[i].importoEuro !== "") {
					entity = {};
					entity["Description"] = tableS[i].tipologia;
					entity["Zzfld00000e"] = "S"; //tipo investiemnto (A, B, S)
					if (oModel.getProperty("/claim3_3")) {
						entity["Zzfld000016"] = "X"; //sgravi
					}
					entity["Zzfld000017"] = tableS[i].importoEuro; //importo sgravi

					oDataModel.create("/posizioniRichiestaSet", entity, param);
				}
			}

		},

		_odataTextCreate: function (param) {
			var oModel = this.getView().getModel();
			var oDataModel = this.getView().getModel("oData");
			var entity;

			if (oModel.getProperty("/tableC_1") !== "") {
				entity = {};
				entity["Tdid"] = "Z001";
				entity["Text"] = oModel.getProperty("/tableC_1");
				oDataModel.create("/testiRichiestaSet", entity, param);
			}
			if (oModel.getProperty("/tableC_2") !== "") {
				entity = {};
				entity["Tdid"] = "Z002";
				entity["Text"] = oModel.getProperty("/tableC_2");
				oDataModel.create("/testiRichiestaSet", entity, param);
			}
			if (oModel.getProperty("/tableC_3") !== "") {
				entity = {};
				entity["Tdid"] = "Z003";
				entity["Text"] = oModel.getProperty("/tableC_3");
				oDataModel.create("/testiRichiestaSet", entity, param);
			}
			if (oModel.getProperty("/tableC_4") !== "") {
				entity = {};
				entity["Tdid"] = "Z004";
				entity["Text"] = oModel.getProperty("/tableC_4");
				oDataModel.create("/testiRichiestaSet", entity, param);
			}
		},

		_odataDocCreate: function (param) {
			var oDataModel = this.getView().getModel("oData");
			var oFileUploaded = this.getView().getModel("file").getData().items;
			var entity;
			for (var i in oFileUploaded) {

				entity = {};
				//entity["Description"] = oFileUploaded[i].fileId;
				entity["Tipologia"] = "ZDOC_ALTRO";
				entity["Nome"] = oFileUploaded[i].fileName;
				entity["Mimetype"] = oFileUploaded[i].fileMimeType;
				//entity["Dimensione"] = oFileUploaded[i].fileDimension;
				entity["Estensione"] = oFileUploaded[i].fileExtension;
				//entity["DataCaricamento"] = oFileUploaded[i].fileUploadDate;
				entity["Content"] = oFileUploaded[i].fileContent;

				oDataModel.create("/documentiRichiestaSet", entity, param);

			}

		},

		// ---------------------------------------------------------------------------------- End Azioni Toolbar

		createObjectMarker: function (sId, oContext) {
			var mSettings = null;

			if (oContext.getProperty("type")) {
				mSettings = {
					type: "{type}",
					press: this.onMarkerPress
				};
			}
			return new ObjectMarker(sId, mSettings);
		},

		formatAttribute: function (sValue) {
			if (jQuery.isNumeric(sValue)) {
				return FileSizeFormat.getInstance({
					binaryFilesize: false,
					maxFractionDigits: 1,
					maxIntegerDigits: 3
				}).format(sValue);
			} else {
				return sValue;
			}
		},

		// ---------------------------------------------------------------------------------- Start File Uploader

		arrayJSONStringify: function (array) {
			for (var i = 0; i < array.length; i++) {
				if (typeof array[i] !== "string") {
					array[i] = JSON.stringify(array[i]);
				}
			}
			return array;
		},

		arrayJSONParse: function (array) {
			for (var i = 0; i < array.length; i++) {
				array[i] = JSON.parse(array[i]);
			}
			return array;

		},

		onChange: function (oEvent) {
			var that = this;
			var oUploadCollection = oEvent.getSource();
			// Header Token
			var oCustomerHeaderToken = new UploadCollectionParameter({
				name: "x-csrf-token",
				value: "securityTokenFromModel"
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);

			var reader = new FileReader();
			var file = oEvent.getParameter("files")[0];
			that.uploadJSON.fileId = jQuery.now().toString();
			that.uploadJSON.fileName = file.name;
			that.uploadJSON.fileMimeType = file.type;
			that.uploadJSON.fileDimension = (file.size / 1000).toFixed(1) + " kB";
			that.uploadJSON.fileExtension = file.name.split(".")[1];
			that.uploadJSON.fileUploadDate = new Date(jQuery.now()).toLocaleDateString();
			reader.onload = function (e) {
				that.uploadJSON.fileContent = e.target.result.substring(5 + that.uploadJSON.fileMimeType.length + 8);
			};

			reader.onerror = function (e) {
				sap.m.MessageToast.show("Errore durante l'upload");
			};

			reader.readAsDataURL(file);

		},

		base64toBlob: function (base64Data, contentType) {
			contentType = contentType || '';
			var sliceSize = 1024;
			var byteCharacters = atob(base64Data);
			var bytesLength = byteCharacters.length;
			var slicesCount = Math.ceil(bytesLength / sliceSize);
			var byteArrays = new Array(slicesCount);

			for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
				var begin = sliceIndex * sliceSize;
				var end = Math.min(begin + sliceSize, bytesLength);
				var bytes = new Array(end - begin);

				for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
					bytes[i] = byteCharacters[offset].charCodeAt(0);
				}

				byteArrays[sliceIndex] = new Uint8Array(bytes);
			}

			return new Blob(byteArrays, {
				type: contentType
			});
		},

		onFileDeleted: function (oEvent) {
			this.deleteItemById(oEvent.getParameter("documentId"));
		},

		deleteItemById: function (sItemToDeleteId) {
			var oData = this.byId("UploadCollection").getModel("file").getData();
			var aItems = jQuery.extend(true, {}, oData).items;
			jQuery.each(aItems, function (index) {
				if (aItems[index] && aItems[index].fileId === sItemToDeleteId) {
					aItems.splice(index, 1);
				}
			});
			this.byId("UploadCollection").getModel("file").setData({
				"items": aItems
			});
			this.byId("attachmentTitle").setText(this.getAttachmentTitleText());
		},

		deleteMultipleItems: function (aItemsToDelete) {
			var oData = this.byId("UploadCollection").getModel("file").getData();
			var nItemsToDelete = aItemsToDelete.length;
			var aItems = jQuery.extend(true, {}, oData).items;
			var i = 0;
			jQuery.each(aItems, function (index) {
				if (aItems[index]) {
					for (i = 0; i < nItemsToDelete; i++) {
						if (aItems[index].fileId === aItemsToDelete[i].getDocumentId()) {
							aItems.splice(index, 1);
						}
					}
				}
			});
			this.byId("UploadCollection").getModel("file").setData({
				"items": aItems
			});
			this.byId("attachmentTitle").setText(this.getAttachmentTitleText());
		},

		onFilenameLengthExceed: function () {
			MessageToast.show("La lunghezza del nome del file è troppo grande.");
		},

		onFileRenamed: function (oEvent) {
			var oData = this.byId("UploadCollection").getModel("file").getData();
			var aItems = jQuery.extend(true, {}, oData).items;
			var sDocumentId = oEvent.getParameter("documentId");
			jQuery.each(aItems, function (index) {
				if (aItems[index] && aItems[index].fileId === sDocumentId) {
					aItems[index].fileName = oEvent.getParameter("item").getFileName();
				}
			});
			this.byId("UploadCollection").getModel("file").setData({
				"items": aItems
			});
		},

		onFileSizeExceed: function () {
			MessageToast.show("Il file caricato è troppo grande.");
		},

		onTypeMissmatch: function () {
			MessageToast.show("Il tipo di file caricato non è supportato.");
		},

		onUploadComplete: function (oEvent) {
			var that = this;
			var oData = this.byId("UploadCollection").getModel("file").getData();

			var blobForURL = this.base64toBlob(that.uploadJSON.fileContent, that.uploadJSON.fileMimeType);
			var fileURL = URL.createObjectURL(blobForURL);

			oData.items.unshift({
				"fileId": that.uploadJSON.fileId,
				"fileName": that.uploadJSON.fileName,
				"fileMimeType": that.uploadJSON.fileMimeType,
				"fileDimension": that.uploadJSON.fileDimension,
				"fileExtension": that.uploadJSON.fileExtension,
				"fileUploadDate": that.uploadJSON.fileUploadDate,
				"fileContent": that.uploadJSON.fileContent,
				"fileThumbnailUrl": "",
				"fileURL": fileURL,
				"attributes": [{
					"title": "Data di caricamento",
					"text": that.uploadJSON.fileUploadDate,
					"active": false
				}, {
					"title": "Dimensione",
					"text": that.uploadJSON.fileDimension,
					"active": false
				}],
				"selected": false
			});
			this.getView().getModel("file").refresh();
			that.uploadJSON = {};

			// Sets the text to the label
			this.byId("attachmentTitle").setText(this.getAttachmentTitleText());
		},

		onBeforeUploadStarts: function (oEvent) {
			// Header Slug
			var oCustomerHeaderSlug = new UploadCollectionParameter({
				name: "slug",
				value: oEvent.getParameter("fileName")
			});
			oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);
		},

		onFileTypeChange: function (oEvent) {
			this.byId("UploadCollection").setFileType(oEvent.getSource().getSelectedKeys());
		},

		onSelectAllPress: function (oEvent) {
			var oUploadCollection = this.byId("UploadCollection");
			if (!oEvent.getSource().getPressed()) {
				this.deselectAllItems(oUploadCollection);
				oEvent.getSource().setPressed(false);
				oEvent.getSource().setText("Select all");
			} else {
				this.deselectAllItems(oUploadCollection);
				oUploadCollection.selectAll();
				oEvent.getSource().setPressed(true);
				oEvent.getSource().setText("Deselect all");
			}
			this.onSelectionChange(oEvent);
		},

		deselectAllItems: function (oUploadCollection) {
			var aItems = oUploadCollection.getItems();
			for (var i = 0; i < aItems.length; i++) {
				oUploadCollection.setSelectedItem(aItems[i], false);
			}
		},

		getAttachmentTitleText: function () {
			var aItems = this.byId("UploadCollection").getItems();
			return "Caricati (" + aItems.length + ")";
		},

		onModeChange: function (oEvent) {
			var oSettingsModel = this.getView().getModel("settings");
			if (oEvent.getParameters().selectedItem.getProperty("key") === MobileLibrary.ListMode.MultiSelect) {
				oSettingsModel.setProperty("/visibleEdit", false);
				oSettingsModel.setProperty("/visibleDelete", false);
				this.enableToolbarItems(true);
			} else {
				oSettingsModel.setProperty("/visibleEdit", true);
				oSettingsModel.setProperty("/visibleDelete", true);
				this.enableToolbarItems(false);
			}
		},

		enableToolbarItems: function (status) {
			this.byId("selectAllButton").setVisible(status);
			this.byId("deleteSelectedButton").setVisible(status);
			this.byId("selectAllButton").setEnabled(status);
			// This is only enabled if there is a selected item in multi-selection mode
			if (this.byId("UploadCollection").getSelectedItems().length > 0) {
				this.byId("deleteSelectedButton").setEnabled(true);
			}
		},

		onDeleteSelectedItems: function () {
			var aSelectedItems = this.byId("UploadCollection").getSelectedItems();
			this.deleteMultipleItems(aSelectedItems);
			if (this.byId("UploadCollection").getSelectedItems().length < 1) {
				this.byId("selectAllButton").setPressed(false);
				this.byId("selectAllButton").setText("Select all");
			}
		},

		onDownloadSelectedItems: function () {
			var oData = this.byId("UploadCollection").getModel("file").getData();
			var aSelectedItems = this.byId("UploadCollection").getSelectedItems();
			var itemsSelected = aSelectedItems.length;
			var i = 0;
			var k = 0;
			for (i = 0; i < itemsSelected; i++) {
				for (k = 0; k < oData.items.length; k++) {
					if (oData.items[k].fileId === aSelectedItems[i].getDocumentId()) {
						var downloadableContent = oData.items[k];
					}
				}
			}
			var blob = this.base64toBlob(downloadableContent.fileContent, downloadableContent.fileMimeType);
			var objectURL = URL.createObjectURL(blob);

			var link = document.createElement('a');
			link.style.display = 'none';
			document.body.appendChild(link);

			link.href = objectURL;
			link.href = URL.createObjectURL(blob);
			link.download = downloadableContent.fileName;
			link.click();

		},

		onSelectionChange: function () {
			var oUploadCollection = this.byId("UploadCollection");
			// Only it is enabled if there is a selected item in multi-selection mode
			if (oUploadCollection.getMode() === MobileLibrary.ListMode.MultiSelect) {
				if (oUploadCollection.getSelectedItems().length > 0) {
					this.byId("deleteSelectedButton").setEnabled(true);
				} else {
					this.byId("deleteSelectedButton").setEnabled(false);
				}
			}
		},

		onOpenAppSettings: function (oEvent) {
			if (!this.oSettingsDialog) {
				this.oSettingsDialog = sap.ui.xmlfragment("sap.m.sample.UploadCollection.AppSettings", this);
				this.getView().addDependent(this.oSettingsDialog);
			}
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this.oSettingsDialog);
			this.oSettingsDialog.open();
		},

		onDialogCloseButton: function () {
			this.oSettingsDialog.close();
		},

		// ---------------------------------------------------------------------------------- End File Uploader

		onParentClicked: function (oEvent) {
			var bSelected = oEvent.getParameter("selected");
			var bId = oEvent.getParameter("id");
			var oModel = this.getView().getModel();

			if (bId === this.createId("_score15")) {
				oModel.setProperty("/score15_2_1", bSelected);
				oModel.setProperty("/score15_2_2", bSelected);
				oModel.setProperty("/score15_2_3", bSelected);
			}

			if (bId === this.createId("_score10")) {

				oModel.setProperty("/score10_2_1", bSelected);
				oModel.setProperty("/score10_2_2", bSelected);
				oModel.setProperty("/score10_2_3", bSelected);
				oModel.setProperty("/score10_2_4", bSelected);
				oModel.setProperty("/score10_2_5", bSelected);
				oModel.setProperty("/score10_2_6", bSelected);
				oModel.setProperty("/score10_2_7", bSelected);

			}
		},

		onCheck: function () {

			var p = false;

			if ((this.getView().byId("box1").getSelected()) && (this.getView().byId("tableC_1").getValue() == '')) {
				this.getView().byId("tableC_1").setValueState("Error");
				this.getView().byId("tableC_1").setValueStateText("Inserire il testo");
				p = true;
			}

			if ((this.getView().byId("box2").getSelected()) && this.getView().byId("tableC_2").getValue() == '') {
				this.getView().byId("tableC_2").setValueState("Error");
				this.getView().byId("tableC_2").setValueStateText("Inserire il testo");
				p = true;
			}

			if ((this.getView().byId("box3").getSelected()) && this.getView().byId("tableC_3").getValue() == '') {
				this.getView().byId("tableC_3").setValueState("Error");
				this.getView().byId("tableC_3").setValueStateText("Inserire il testo");
				p = true;
			}

			if ((this.getView().byId("box4").getSelected()) && this.getView().byId("tableC_4").getValue() == '') {
				this.getView().byId("tableC_4").setValueState("Error");
				this.getView().byId("tableC_4").setValueStateText("Inserire il testo");
				p = true;
			}

			return p;

		},
	});
});