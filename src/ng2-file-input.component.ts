import { FileInputHandlerService } from './file-input-handler.service';
import { Component, ElementRef, Input, Output, EventEmitter, OnInit, Inject, forwardRef, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Ng2FileInputOptionsInterface } from './ng2-file-input-options.interface';
import { Ng2FileInputOptions } from './ng2-file-input-options.class';
import { Ng2FileInputAction } from './ng2-file-input-action.enum';
import { FileInput } from './file-input.interface';

// <div fileDrop class="ng2-file-input-drop-container" [ngClass]="{'file-is-over': fileIsOver}" (fileOver)="fileOver($event)"
// (onFileDrop)="onFileDrop($event)">
// <span [innerHTML]="dropText"></span>
// <button type="button" (click)="ng2FileInputSelect.click()" class="btn btn-primary" [innerHTML]="browseText"></button>
// </div>

// <span class="ng2-file-input-file-text remove" (click)="removeFile($event, file)" *ngIf="removable">
                            //     <p [innerHTML]="removeText"></p>
                            // </span> 
@Component({
    selector: 'ng2-file-input',
    template: `<div class="ng2-file-input">
    <button type="button" (click)="ng2FileInputSelect.click()" class="btn btn-sm btn-secondary inline-block" [innerHTML]="browseText"></button>                
    <span class="ng2-file-input-invalid text-danger" [hidden]="!invalidFile" [innerHTML]="invalidFileText"></span>
                    <div class="margin-top-tiny fs-12">Only .png and .jpg supported</div>
                    <div class="ng2-file-input-files row margin-top-small" *ngIf="showPreviews">
                        <div *ngFor="let file of getCurrentFiles()" class="ng2-file-input-file col-md-4 margin-bottom-small" [ngClass]="{'image':file.type.indexOf('image')!==-1}">
                            <div class="previewCard">
                                <div class="row">
                                    <span class="icon-top-right" (click)="removeFile($event, file)" *ngIf="removable">
                                        <span class="fa fa-close"></span>
                                    </span>
                                </div>
                                <div class="row padding-left">
                                    <div class="col-xs-2 no-padding">
                                    <img [src]="getObjectUrl(file)" *ngIf="file.type.indexOf('image')!==-1">
                                    </div>
                                    <div class="col-xs-10 padding-top-7">
                                    <h2 [innerHTML]="file.name" class="ng2-file-input-file-text no-margin"></h2>
                                    <div [innerHTML]="(file.size / 1024).toFixed(2) + 'kb'" class="ng2-file-input-file-text margin-top-mini"></div>
                                    </div>
                                </div> 
                            </div>
                        </div>
                    </div>
                    <input type="file" #ng2FileInputSelect (change)="fileSelected($event)" accept="image/png, image/jpeg" [attr.multiple]="(multiple ? true : null)">
                </div>`,
})
export class Ng2FileInputComponent implements OnInit, OnDestroy {
    private alreadyEmitted: boolean = false;
    private options: Ng2FileInputOptionsInterface;
    public fileIsOver: boolean = false;
    public invalidFile: boolean = false;
    @Input() id: string;
    @Input('drop-text') dropText: string;
    @Input('browse-text') browseText: string;
    @Input('remove-text') removeText: string;
    @Input('invalid-file-text') invalidFileText: string;
    @Input('invalid-file-timeout') invalidFileTimeout: number;
    @Input('multiple') multiple: boolean=null;
    @Input('accept') accept: string;
    @Input('removable') removable: boolean=null;
    @Input('show-previews') showPreviews: boolean=null;
    @Input('extensions') extensions: string[];
    @Output('onAction') outputAction = new EventEmitter();
    @Output('onRemoved') outputRemoved = new EventEmitter();
    @Output('onAdded') outputAdded = new EventEmitter();
    @Output('onInvalidDenied') outputInvalidDenied = new EventEmitter();
    @Output('onCouldNotRemove') outputCouldNotRemove = new EventEmitter();
    @Output('onCouldNotAdd') outputCouldNotAdd = new EventEmitter();
    constructor(@Inject(forwardRef(() => FileInputHandlerService)) private fileInputHandlerService: FileInputHandlerService, @Inject(forwardRef(() => DomSanitizer)) private sanitizer: DomSanitizer,@Inject(forwardRef(() => Ng2FileInputOptions)) private defaultOptions: Ng2FileInputOptions) {
    }
    ngOnInit() {
        this.dropText = this.dropText || this.defaultOptions.dropText;
        this.browseText = this.browseText || this.defaultOptions.browseText;
        this.removeText = this.removeText || this.defaultOptions.removeText;
        this.invalidFileText = this.invalidFileText || this.defaultOptions.invalidFileText;
        this.invalidFileTimeout = this.invalidFileTimeout || this.defaultOptions.invalidFileTimeout;
        this.multiple = this.multiple !== null ? this.multiple : this.defaultOptions.multiple;
        this.accept = this.accept !== null ? this.accept : this.defaultOptions.accept;
        this.removable = this.removable !== null ? this.removable : this.defaultOptions.removable;
        this.showPreviews = this.showPreviews !== null ? this.showPreviews : this.defaultOptions.showPreviews;
        this.extensions = this.extensions || this.defaultOptions.extensions;
        if(typeof(this.id)==="undefined" || !this.id || this.id===null){
            this.id=this.generateId();
        }
        this.fileInputHandlerService.add(this.id);
        console.log('hallo');
    }
    ngOnDestroy(){
        this.fileInputHandlerService.remove(this.id);
    }
    public fileOver(fileIsOver: boolean): void {
        this.fileIsOver = fileIsOver;
    }
    public onFileDrop(file: File): void {
        if (!this.multiple) {
            //make sure only to emit once
            if (!this.alreadyEmitted) {
                this.alreadyEmitted = true;
                this.handleFile(file);
                setTimeout(() => { this.alreadyEmitted = false; }, 0);
            }
        }
        else {
            this.handleFile(file);
        }
    }
    public fileSelected(event): void {
        this.invalidFile = false;
        let files = event.target.files;
        if (files && files.length) {
            if (!this.multiple) {
                //make sure only to emit one
                this.handleFile(files[0]);
            }
            else {
                for (let i = 0; i < files.length; i++) {
                    this.handleFile(files[i]);
                }
            }
        }
        setTimeout(() => { event.target.value = "" }, 0);
    }
    public getCurrentFiles():File[]{
        let fileInput:FileInput=this.fileInputHandlerService.getFileInput(this.id);
        return fileInput ? fileInput.currentFiles : [];
    }
    public removeFile($event, file: File) {
        if (this.removable) {
            let notRemovedFiles:File[]=this.fileInputHandlerService.removeFiles(this.id, [file]);
            if(notRemovedFiles.length===0){
                this.emitOutput(file, Ng2FileInputAction.Removed);
            }
            else{
                this.emitOutput(file, Ng2FileInputAction.CouldNotRemove);
            }
            $event.stopPropagation();
        }
    }
    public getObjectUrl(file: File): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(window.URL.createObjectURL(file));
    }

    private handleFile(file: File): void {
        if (this.isValidFile(file)) {
            if(!this.multiple){
                this.fileInputHandlerService.reset(this.id);
            }
            let notAddedFiles:File[]=this.fileInputHandlerService.addFiles(this.id, [file]);
            if(notAddedFiles.length===0){
                this.emitOutput(file, Ng2FileInputAction.Added);
            }
            else{
                this.emitOutput(file, Ng2FileInputAction.CouldNotAdd);
            }
        }
        else{
            this.emitOutput(file, Ng2FileInputAction.InvalidDenied);
        }
    }

    private emitOutput(file:File, action:Ng2FileInputAction):void{
        this.outputAction.emit({
            id: this.id,
            currentFiles: this.getCurrentFiles(),
            action: action,
            file: file
        });
        switch (action){
            case Ng2FileInputAction.Added:
                this.outputAdded.emit({
                    id: this.id,
                    currentFiles: this.getCurrentFiles(),
                    file: file
                })
                break;
            case Ng2FileInputAction.Removed:
                this.outputRemoved.emit({
                    id: this.id,
                    currentFiles: this.getCurrentFiles(),
                    file: file
                })
                break;
            case Ng2FileInputAction.InvalidDenied:
                this.outputInvalidDenied.emit({
                    id: this.id,
                    currentFiles: this.getCurrentFiles(),
                    file: file
                })
                break;
            case Ng2FileInputAction.CouldNotAdd:
                this.outputCouldNotAdd.emit({
                    id: this.id,
                    currentFiles: this.getCurrentFiles(),
                    file: file
                })
                break;
            case Ng2FileInputAction.CouldNotRemove:
                this.outputCouldNotRemove.emit({
                    id: this.id,
                    currentFiles: this.getCurrentFiles(),
                    file: file
                })
                break;
        }
    }
    private isValidFile(file: File): Boolean {
        if (this.extensions.length > 0) {
            let ext: string = file.name.split('.').pop();
            if ((this.extensions.indexOf('image/jpg') !== -1) && (this.extensions.indexOf('image/jpeg') === -1)) {
                this.extensions.push('image/jpeg');
            };
            if (this.extensions.indexOf(file.type) === -1 && this.extensions.indexOf(ext) === -1) {
                this.invalidFile = true;
                if (this.invalidFileTimeout !== 0) {
                    setTimeout(() => {
                        this.invalidFile = false;
                    }, this.invalidFileTimeout);
                }

                return false;
            }
        }
        return true;
    }
    private generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }   
}
