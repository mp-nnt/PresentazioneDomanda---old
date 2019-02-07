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
				"items": ["jpg", "txt", "ppt", "doc", "docx", "xls", "pdf", "png"],
				"selected": ["jpg", "txt", "ppt", "doc", "docx", "xls", "pdf", "png"]
			}), "fileTypes");

			// Sets the text to the label
			this.byId("UploadCollection").addEventDelegate({
				onBeforeRendering: function () {
					this.byId("attachmentTitle").setText(this.getAttachmentTitleText());
				}.bind(this)
			});
		},

		onAfterRendering: function () {
			this.oModel = this.getView().getModel();
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
						//oModel.setProperty("/state", oData.);
						//oModel.setProperty("/region", oData.);
						oModel.setProperty("/postcode", oData.Cap);
						oModel.setProperty("/city", oData.Citta);
						//oModel.setProperty("/district", oData.);
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

			// salvo task senza completare
			this.completeTask(false);

		},

		onConfirm: function () {

			this.getView().setBusyIndicatorDelay(0);
			this.getView().setBusy(true);

			// completo task e creo la richiesta
			this.completeTask(true);
			this.requestCreation();

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
				this.getView().setBusy(false);
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
			entity["Zzfld00000z"] = oModel.getProperty("/stamp_duty_id");
			if (oModel.getProperty("/stamp_duty_date") !== "") {
				//	entity["Zzfld000010"] = oModel.getProperty("/stamp_duty_date"); <--- momentaneamente tolto su SEGW
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

		onChange: function (oEvent) {
			var oUploadCollection = oEvent.getSource();
			//var token = this.getView().getModel("file").getSecurityToken();

			// Header Token
			var oCustomerHeaderToken = new UploadCollectionParameter({
				name: "x-csrf-token",
				value: "Fetch"
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);

			var that = this;
			var reader = new FileReader();
			var file = oEvent.getParameter("files")[0];

			reader.onload = function (e) {

				var raw = e.target.result;
				//sap.m.MessageToast.show("binary string: " + raw);
			};

			reader.onerror = function (e) {
				sap.m.MessageToast.show("error");
			};
			reader.readAsArrayBuffer(file);
			//reader.readAsDataURL(file);
			//reader.readAsBinaryString(file);

		},

		onFileDeleted: function (oEvent) {
			this.deleteItemById(oEvent.getParameter("documentId"));
			MessageToast.show(oEvent.getParameter("fileName") + " deleted");
		},

		deleteItemById: function (sItemToDeleteId) {
			var oData = this.byId("UploadCollection").getModel("file").getData();
			var aItems = jQuery.extend(true, {}, oData).items;
			jQuery.each(aItems, function (index) {
				if (aItems[index] && aItems[index].documentId === sItemToDeleteId) {
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
						if (aItems[index].documentId === aItemsToDelete[i].getDocumentId()) {
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
			MessageToast.show("FilenameLengthExceed event triggered.");
		},

		onFileRenamed: function (oEvent) {
			var oData = this.byId("UploadCollection").getModel("file").getData();
			var aItems = jQuery.extend(true, {}, oData).items;
			var sDocumentId = oEvent.getParameter("documentId");
			jQuery.each(aItems, function (index) {
				if (aItems[index] && aItems[index].documentId === sDocumentId) {
					aItems[index].fileName = oEvent.getParameter("item").getFileName();
				}
			});
			this.byId("UploadCollection").getModel("file").setData({
				"items": aItems
			});
		},

		onFileSizeExceed: function () {
			MessageToast.show("FileSizeExceed event triggered.");
		},

		onTypeMissmatch: function () {
			MessageToast.show("TypeMissmatch event triggered.");
		},

		onUploadComplete: function (oEvent) {
			var oUploadCollection = this.byId("UploadCollection");
			var oData = oUploadCollection.getModel("file").getData();

			oData.items.unshift({
				"documentId": jQuery.now().toString(), // generate Id,
				"fileName": oEvent.getParameter("files")[0].fileName,
				"mimeType": "",
				"thumbnailUrl": "",
				"url": "",
				"attributes": [{
						"title": "Uploaded By",
						"text": "You",
						"active": false
					}, {
						"title": "Uploaded On",
						"text": new Date(jQuery.now()).toLocaleDateString(),
						"active": false
					}
					//, 
					//{
					//	"title": "File Size",
					//	"text": "505000",
					//	"active": false
					//}
				],
				"statuses": [{
					"title": "",
					"text": "",
					"state": "None"
				}],
				"markers": [{}],
				"selected": false
			});
			this.getView().getModel("file").refresh();

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

		onUploadTerminated: function (oEvent) {
			/*
			// get parameter file name
			var sFileName = oEvent.getParameter("fileName");
			// get a header parameter (in case no parameter specified, the callback function getHeaderParameter returns all request headers)
			var oRequestHeaders = oEvent.getParameters().getHeaderParameter();
			*/
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
			return "Uploaded (" + aItems.length + ")";
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
			MessageToast.show("Delete selected items button press.");
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

		onAttributePress: function (oEvent) {
			MessageToast.show("Attribute press event - " + oEvent.getSource().getTitle() + ": " + oEvent.getSource().getText());
		},

		onMarkerPress: function (oEvent) {
			MessageToast.show("Marker press event - " + oEvent.getSource().getType());
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
		}

		// ---------------------------------------------------------------------------------- End File Uploader

	});
});